import { getDb } from "@/lib/db/server/client";
import { errMessage, uid } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import {
  testerModels,
  testerProbes,
  testerProviders,
  testerTests,
} from "@/lib/db/schema/tester";
import { GUEST_USER_ID } from "@/lib/config/constants";
import { providerForModel } from "@/lib/ai/verify/models";
import { runVerification } from "@/lib/ai/verify/runner";
import { serverTransport } from "./server-verify.service";
import { and, desc, eq, gt, isNotNull, ne, sql } from "drizzle-orm";
import type {
  ProviderAggregateRow,
  RankingAggregateRow,
  RankingRecentRow,
  TestResultDetail,
  VerifyAndPublishBody,
} from "@/lib/api/typebox/model-tester";
import type {
  VerifyProviderValue,
  VerifyVerdictValue,
} from "@/lib/validation/model-tester";
import type { VerifyResult } from "@/lib/ai/verify/types";

const DEDUPE_WINDOW_MS = 60_000;

// returning() on a conflict yields the EXISTING row's id, which is what makes
// these upserts find-or-create rather than needing a second lookup.
async function findOrCreateProvider(
  kind: VerifyProviderValue,
  host: string,
  testedAt: Date,
): Promise<string> {
  const rows = await getDb()
    .insert(testerProviders)
    .values({
      userId: GUEST_USER_ID,
      kind,
      baseUrlHost: host,
      firstSeenAt: testedAt,
      lastTestedAt: testedAt,
    })
    .onConflictDoUpdate({
      target: [
        testerProviders.userId,
        testerProviders.kind,
        testerProviders.baseUrlHost,
      ],
      set: { lastTestedAt: testedAt },
    })
    .returning({ id: testerProviders.id });
  return rows[0]!.id;
}

async function findOrCreateModel(
  providerId: string,
  requestedModel: string,
  testedAt: Date,
): Promise<string> {
  const rows = await getDb()
    .insert(testerModels)
    .values({
      userId: GUEST_USER_ID,
      providerId,
      requestedModel,
      lastTestedAt: testedAt,
    })
    .onConflictDoUpdate({
      target: [testerModels.providerId, testerModels.requestedModel],
      set: { lastTestedAt: testedAt },
    })
    .returning({ id: testerModels.id });
  return rows[0]!.id;
}

export async function verifyAndPublish(
  body: VerifyAndPublishBody,
  submitterUserId: number | null,
  submitterUsername: string | null,
): Promise<
  | {
      published: boolean;
      deduped: false;
      result: VerifyResult;
    }
  | { published: false; deduped: true }
  | { published: false; error: string; result?: VerifyResult }
> {
  const inferred = providerForModel(body.model);
  if (inferred !== null && inferred !== body.provider)
    return { published: false, error: "format-mismatch" };

  const db = getDb();
  const kind = body.provider;
  const host = URL.canParse(body.baseUrl)
    ? new URL(body.baseUrl).host
    : body.baseUrl;

  if (submitterUserId !== null && submitterUserId !== GUEST_USER_ID) {
    const since = new Date(Date.now() - DEDUPE_WINDOW_MS);
    try {
      const recent = await db
        .select({ id: testerTests.id })
        .from(testerTests)
        .where(
          and(
            eq(testerTests.submitterUserId, submitterUserId),
            eq(testerTests.baseUrlHost, host),
            eq(testerTests.requestedModel, body.model),
            gt(testerTests.createdAt, since),
          ),
        )
        .limit(1);
      if (recent[0]) return { published: false, deduped: true };
    } catch (err) {
      logger.warn("Dedupe lookup failed, continuing without it", {
        context: "model-tester",
        err: errMessage(err),
      });
    }
  }

  const result = await runVerification({
    provider: body.provider,
    baseUrl: body.baseUrl.replace(/\/+$/, ""),
    apiKey: body.apiKey,
    model: body.model,
    mode: "direct",
    transport: serverTransport,
  });
  // Hand the result back even though nothing is published: it carries the
  // per-probe evidence that explains WHY the endpoint failed, and dropping it
  // left the user with a bare "could not verify" and nothing to act on.
  if (result.connectivityError)
    return { published: false, error: result.connectivityError, result };

  const now = new Date();
  try {
    await persistPublishedTest({
      body,
      result,
      kind,
      host,
      now,
      submitterUserId,
      submitterUsername,
    });
  } catch (err) {
    logger.warn("Publish write failed, returning unsaved result", {
      context: "model-tester",
      err: errMessage(err),
    });
    return { published: false, deduped: false, result };
  }
  return { published: true, deduped: false, result };
}

async function persistPublishedTest(opts: {
  body: VerifyAndPublishBody;
  result: VerifyResult;
  kind: VerifyProviderValue;
  host: string;
  now: Date;
  submitterUserId: number | null;
  submitterUsername: string | null;
}): Promise<void> {
  const db = getDb();
  const { body, result, kind, host, now } = opts;
  const providerId = await findOrCreateProvider(kind, host, now);
  const modelId = await findOrCreateModel(providerId, body.model, now);

  const testId = uid();
  await db.insert(testerTests).values({
    id: testId,
    userId: GUEST_USER_ID,
    modelId,
    providerId,
    submitterUserId: opts.submitterUserId,
    submitterUsername: opts.submitterUsername,
    kind,
    baseUrlHost: host,
    requestedModel: body.model,
    detectedModel: result.detectedModel,
    verdict: result.verdict,
    versionUnverifiable: result.versionUnverifiable,
    probesPassed: result.probesPassed,
    probesTotal: result.probesTotal,
    latencyMs: result.latencyMs,
    totalTokens: result.totalUsage?.total ?? null,
    promptTokens: result.totalUsage?.prompt ?? null,
    completionTokens: result.totalUsage?.completion ?? null,
    transport: result.transport,
    formatFellBack: result.resolvedProvider !== result.provider,
    resolvedFormat: result.resolvedProvider,
    testedAt: now,
    verifiedAt: now,
  });

  if (!result.probes.length) return;
  await db.insert(testerProbes).values(
    result.probes.map((p, orderIndex) => ({
      testId,
      orderIndex,
      label: p.label,
      prompt: p.prompt,
      responseText: p.responseText,
      httpStatus: p.httpStatus,
      pass: p.pass,
      transient: p.transient,
      signal: p.signal,
      reason: p.reason,
      promptTokens: p.usage?.prompt ?? null,
      completionTokens: p.usage?.completion ?? null,
      latencyMs: p.latencyMs,
    })),
  );
}

// Nearest-rank p95, keyed by host and by host:::model from ONE pass, since
// both groupings read the same rows and every caller wants at least one.
async function p95ByGroup(where: ReturnType<typeof and>) {
  const rows = await getDb()
    .select({
      host: testerTests.baseUrlHost,
      model: testerTests.requestedModel,
      latencyMs: testerTests.latencyMs,
    })
    .from(testerTests)
    .where(where)
    .orderBy(testerTests.latencyMs);

  const groups = new Map<string, number[]>();
  for (const r of rows) {
    const host = r.host ?? "";
    for (const key of [host, `${host}:::${r.model ?? ""}`]) {
      const arr = groups.get(key);
      if (arr) arr.push(r.latencyMs);
      else groups.set(key, [r.latencyMs]);
    }
  }
  const out = new Map<string, number>();
  for (const [key, arr] of groups) {
    out.set(key, arr[Math.floor(0.95 * (arr.length - 1))]!);
  }
  return out;
}

const PASS_RATE_SQL = sql`avg(cast(${testerTests.probesPassed} as real) / max(${testerTests.probesTotal}, 1))`;

const LAST_TESTED_SQL = sql`max(${testerTests.testedAt})`;

const verdictCount = (verdict: VerifyVerdictValue) =>
  sql<number>`sum(case when ${testerTests.verdict} = ${verdict} then 1 else 0 end)`;

const SHARED_AGG = {
  provider: sql<VerifyProviderValue>`max(${testerTests.kind})`,
  baseUrlHost: testerTests.baseUrlHost,
  sampleCount: sql<number>`count(*)`,
  avgPassRate: PASS_RATE_SQL.mapWith(Number),
  avgLatencyMs: sql<number>`avg(${testerTests.latencyMs})`,
  avgTotalTokens: sql<number | null>`avg(${testerTests.totalTokens})`,
  genuineCount: verdictCount("genuine"),
  suspiciousCount: verdictCount("suspicious"),
  unverifiedCount: verdictCount("unverified"),
  lastTestedAt: LAST_TESTED_SQL.mapWith(Number),
};

const AGG_SELECT = { ...SHARED_AGG, model: testerTests.requestedModel };

const PROVIDER_SELECT = {
  ...SHARED_AGG,
  modelCount: sql<number>`count(distinct ${testerTests.requestedModel})`,
};

export async function getProviders(
  page: number,
  pageSize: number,
): Promise<{
  rows: ProviderAggregateRow[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const db = getDb();
  const offset = (page - 1) * pageSize;

  const [rows, distinct, p95] = await Promise.all([
    db
      .select(PROVIDER_SELECT)
      .from(testerTests)
      .where(isNotNull(testerTests.verifiedAt))
      .groupBy(testerTests.baseUrlHost)
      .orderBy(desc(LAST_TESTED_SQL), desc(PASS_RATE_SQL))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ c: sql<number>`count(distinct ${testerTests.baseUrlHost})` })
      .from(testerTests)
      .where(isNotNull(testerTests.verifiedAt)),
    p95ByGroup(isNotNull(testerTests.verifiedAt)),
  ]);

  return {
    rows: rows.map((r) => ({
      ...r,
      p95LatencyMs: p95.get(r.baseUrlHost ?? "") ?? null,
    })) as ProviderAggregateRow[],
    total: distinct[0]?.c ?? 0,
    page,
    pageSize,
  };
}

export async function getProviderDetail(host: string): Promise<{
  provider: ProviderAggregateRow | null;
  models: RankingAggregateRow[];
}> {
  const db = getDb();
  const where = and(
    eq(testerTests.baseUrlHost, host),
    isNotNull(testerTests.verifiedAt),
  );

  const [provider, models, p95] = await Promise.all([
    db
      .select(PROVIDER_SELECT)
      .from(testerTests)
      .where(where)
      .groupBy(testerTests.baseUrlHost)
      .limit(1),
    // Most endpoints score 100%, so ranking these by pass rate leaves the list
    // in an arbitrary tie order. Newest run first is what makes the page
    // readable.
    db
      .select(AGG_SELECT)
      .from(testerTests)
      .where(where)
      .groupBy(testerTests.requestedModel)
      .orderBy(desc(LAST_TESTED_SQL), desc(PASS_RATE_SQL)),
    p95ByGroup(where),
  ]);

  return {
    provider: provider[0]
      ? ({
          ...provider[0],
          p95LatencyMs: p95.get(host) ?? null,
        } as ProviderAggregateRow)
      : null,
    models: models.map((m) => ({
      ...m,
      p95LatencyMs: p95.get(`${host}:::${m.model}`) ?? null,
    })) as RankingAggregateRow[],
  };
}

export async function getRankingsStats(): Promise<{
  totalDetections: number;
  providersTracked: number;
  avgPassRate: number;
}> {
  const db = getDb();
  const rows = await db
    .select({
      total: sql<number>`count(*)`,
      providers: sql<number>`count(distinct ${testerTests.baseUrlHost})`,
      passRate: PASS_RATE_SQL.mapWith(Number),
    })
    .from(testerTests)
    .where(isNotNull(testerTests.verifiedAt));
  const r = rows[0];
  return {
    totalDetections: r?.total ?? 0,
    providersTracked: r?.providers ?? 0,
    avgPassRate: r?.passRate ?? 0,
  };
}

export async function getRankingDetail(host: string, model: string) {
  const db = getDb();
  const where = and(
    eq(testerTests.baseUrlHost, host),
    eq(testerTests.requestedModel, model),
    isNotNull(testerTests.verifiedAt),
  );

  const [agg, recent, p95] = await Promise.all([
    db
      .select(AGG_SELECT)
      .from(testerTests)
      .where(where)
      .groupBy(testerTests.baseUrlHost, testerTests.requestedModel)
      .limit(1),
    db
      .select({
        id: testerTests.id,
        verdict: testerTests.verdict,
        detectedModel: testerTests.detectedModel,
        probesPassed: testerTests.probesPassed,
        probesTotal: testerTests.probesTotal,
        latencyMs: testerTests.latencyMs,
        totalTokens: testerTests.totalTokens,
        transport: testerTests.transport,
        testedAt: testerTests.testedAt,
        submitterUserId: testerTests.submitterUserId,
        submitterUsername: testerTests.submitterUsername,
      })
      .from(testerTests)
      .where(where)
      .orderBy(desc(testerTests.testedAt))
      .limit(20),
    p95ByGroup(where),
  ]);

  return {
    aggregate: agg[0]
      ? ({
          ...agg[0],
          p95LatencyMs: p95.get(`${host}:::${model}`) ?? null,
        } as RankingAggregateRow)
      : null,
    recent: recent.map((r) => ({
      ...r,
      testedAt: r.testedAt.getTime(),
    })) as RankingRecentRow[],
  };
}

export async function getPublishedTestDetail(
  testId: string,
): Promise<TestResultDetail | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(testerTests)
    .where(and(eq(testerTests.id, testId), isNotNull(testerTests.verifiedAt)))
    .limit(1);
  const test = rows[0];
  if (!test) return null;

  const probes = await db
    .select()
    .from(testerProbes)
    .where(eq(testerProbes.testId, testId))
    .orderBy(testerProbes.orderIndex);

  return {
    model: test.requestedModel ?? "",
    baseUrlHost: test.baseUrlHost ?? "",
    provider: (test.kind ?? "openai") as VerifyProviderValue,
    verdict: test.verdict,
    versionUnverifiable: test.versionUnverifiable,
    detectedModel: test.detectedModel,
    probesPassed: test.probesPassed,
    probesTotal: test.probesTotal,
    totalTokens: test.totalTokens,
    latencyMs: test.latencyMs,
    transport: test.transport ?? "server",
    resolvedFormat: test.resolvedFormat ?? test.kind ?? "openai",
    formatFellBack: test.formatFellBack ?? false,
    testedAt: test.testedAt.getTime(),
    probes: probes.map((p) => ({
      label: p.label,
      pass: p.pass,
      transient: p.transient,
      signal: p.signal,
      reason: p.reason,
      prompt: p.prompt,
      responseText: p.responseText,
      httpStatus: p.httpStatus,
      promptTokens: p.promptTokens,
      completionTokens: p.completionTokens,
      latencyMs: p.latencyMs,
    })),
  };
}

export async function deletePublishedTest(
  id: string,
  userId: number | null,
): Promise<{ deleted: boolean }> {
  if (userId === null || userId === GUEST_USER_ID) return { deleted: false };
  const db = getDb();
  const rows = await db
    .delete(testerTests)
    .where(
      and(
        eq(testerTests.id, id),
        eq(testerTests.submitterUserId, userId),
        ne(testerTests.submitterUserId, GUEST_USER_ID),
      ),
    )
    .returning({ id: testerTests.id });
  return { deleted: rows.length > 0 };
}
