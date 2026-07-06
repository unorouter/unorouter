import { getDb } from "@/lib/db/server/client";
import { uid } from "@/lib/utils/base";
import {
  testerModels,
  testerProbes,
  testerProviders,
  testerTests,
} from "@/lib/db/schema/shared";
import { GUEST_USER_ID } from "@/lib/config/constants";
import { providerForModel } from "@/lib/ai/verify/models";
import { runServerVerification } from "./server-verify.service";
import { and, desc, eq, gt, isNotNull, ne, sql } from "drizzle-orm";
import type {
  ProviderAggregateRow,
  RankingAggregateRow,
  RankingRecentRow,
  TestResultDetail,
  VerifyAndPublishBody,
} from "@/lib/api/typebox/model-tester";
import type { VerifyProviderValue } from "@/lib/validation/model-tester";
import type { VerifyResult } from "@/lib/ai/verify/types";

const DEDUPE_WINDOW_MS = 60_000;

async function findOrCreateProvider(
  kind: VerifyProviderValue,
  host: string,
  testedAt: Date,
): Promise<string> {
  const db = getDb();
  await db
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
    });
  const rows = await db
    .select({ id: testerProviders.id })
    .from(testerProviders)
    .where(
      and(
        eq(testerProviders.userId, GUEST_USER_ID),
        eq(testerProviders.kind, kind),
        eq(testerProviders.baseUrlHost, host),
      ),
    )
    .limit(1);
  return rows[0]!.id;
}

async function findOrCreateModel(
  providerId: string,
  requestedModel: string,
  testedAt: Date,
): Promise<string> {
  const db = getDb();
  await db
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
    });
  const rows = await db
    .select({ id: testerModels.id })
    .from(testerModels)
    .where(
      and(
        eq(testerModels.providerId, providerId),
        eq(testerModels.requestedModel, requestedModel),
      ),
    )
    .limit(1);
  return rows[0]!.id;
}

export async function verifyAndPublish(
  body: VerifyAndPublishBody,
  submitterUserId: number | null,
  submitterUsername: string | null,
): Promise<
  | {
      published: true;
      deduped: false;
      result: VerifyResult;
    }
  | { published: false; deduped: true }
  | { published: false; error: string }
> {
  const inferred = providerForModel(body.model);
  if (inferred !== null && inferred !== body.provider)
    return { published: false, error: "format-mismatch" };

  const db = getDb();
  const kind = body.provider;
  let host = body.baseUrl;
  try {
    host = new URL(body.baseUrl).host;
  } catch {
    host = body.baseUrl;
  }

  if (submitterUserId !== null && submitterUserId !== GUEST_USER_ID) {
    const since = new Date(Date.now() - DEDUPE_WINDOW_MS);
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
  }

  const result = await runServerVerification({
    provider: body.provider,
    baseUrl: body.baseUrl.replace(/\/+$/, ""),
    apiKey: body.apiKey,
    model: body.model,
  });
  if (result.connectivityError)
    return { published: false, error: result.connectivityError };

  const now = new Date();
  const providerId = await findOrCreateProvider(kind, host, now);
  const modelId = await findOrCreateModel(providerId, body.model, now);

  const testId = uid();
  await db.insert(testerTests).values({
    id: testId,
    userId: GUEST_USER_ID,
    modelId,
    providerId,
    submitterUserId,
    submitterUsername,
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

  for (let i = 0; i < result.probes.length; i++) {
    const p = result.probes[i]!;
    await db.insert(testerProbes).values({
      testId,
      orderIndex: i,
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
    });
  }
  return { published: true, deduped: false, result };
}

async function p95ByGroup(
  where: ReturnType<typeof and>,
  byHostModel: boolean,
): Promise<Map<string, number>> {
  const db = getDb();
  const rows = await db
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
    const key = byHostModel ? `${host}:::${r.model ?? ""}` : host;
    const arr = groups.get(key);
    if (arr) arr.push(r.latencyMs);
    else groups.set(key, [r.latencyMs]);
  }
  const out = new Map<string, number>();
  for (const [key, arr] of groups) {
    const idx = Math.floor(0.95 * (arr.length - 1));
    out.set(key, arr[idx]!);
  }
  return out;
}

const AGG_SELECT = {
  provider: sql<VerifyProviderValue>`max(${testerTests.kind})`,
  model: testerTests.requestedModel,
  baseUrlHost: testerTests.baseUrlHost,
  sampleCount: sql<number>`count(*)`,
  avgPassRate: sql<number>`avg(cast(${testerTests.probesPassed} as real) / max(${testerTests.probesTotal}, 1))`,
  avgLatencyMs: sql<number>`avg(${testerTests.latencyMs})`,
  avgTotalTokens: sql<number | null>`avg(${testerTests.totalTokens})`,
  genuineCount: sql<number>`sum(case when ${testerTests.verdict} = 'genuine' then 1 else 0 end)`,
  suspiciousCount: sql<number>`sum(case when ${testerTests.verdict} = 'suspicious' then 1 else 0 end)`,
  unverifiedCount: sql<number>`sum(case when ${testerTests.verdict} = 'unverified' then 1 else 0 end)`,
  lastTestedAt: sql<number>`max(${testerTests.testedAt})`,
};

const PROVIDER_SELECT = {
  provider: sql<VerifyProviderValue>`max(${testerTests.kind})`,
  baseUrlHost: testerTests.baseUrlHost,
  modelCount: sql<number>`count(distinct ${testerTests.requestedModel})`,
  sampleCount: sql<number>`count(*)`,
  avgPassRate: sql<number>`avg(cast(${testerTests.probesPassed} as real) / max(${testerTests.probesTotal}, 1))`,
  avgLatencyMs: sql<number>`avg(${testerTests.latencyMs})`,
  avgTotalTokens: sql<number | null>`avg(${testerTests.totalTokens})`,
  genuineCount: sql<number>`sum(case when ${testerTests.verdict} = 'genuine' then 1 else 0 end)`,
  suspiciousCount: sql<number>`sum(case when ${testerTests.verdict} = 'suspicious' then 1 else 0 end)`,
  unverifiedCount: sql<number>`sum(case when ${testerTests.verdict} = 'unverified' then 1 else 0 end)`,
  lastTestedAt: sql<number>`max(${testerTests.testedAt})`,
};

const PASS_RATE_SQL = sql`avg(cast(${testerTests.probesPassed} as real) / max(${testerTests.probesTotal}, 1))`;

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

  const rows = await db
    .select(PROVIDER_SELECT)
    .from(testerTests)
    .where(isNotNull(testerTests.verifiedAt))
    .groupBy(testerTests.baseUrlHost)
    .orderBy(desc(PASS_RATE_SQL))
    .limit(pageSize)
    .offset(offset);

  const distinct = await db
    .select({
      c: sql<number>`count(distinct ${testerTests.baseUrlHost})`,
    })
    .from(testerTests)
    .where(isNotNull(testerTests.verifiedAt));

  const p95 = await p95ByGroup(isNotNull(testerTests.verifiedAt), false);

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

  const provider = await db
    .select(PROVIDER_SELECT)
    .from(testerTests)
    .where(where)
    .groupBy(testerTests.baseUrlHost)
    .limit(1);

  const models = await db
    .select(AGG_SELECT)
    .from(testerTests)
    .where(where)
    .groupBy(testerTests.requestedModel)
    .orderBy(desc(PASS_RATE_SQL));

  const providerP95 = await p95ByGroup(where, false);
  const modelP95 = await p95ByGroup(where, true);

  return {
    provider: provider[0]
      ? ({
          ...provider[0],
          p95LatencyMs: providerP95.get(host) ?? null,
        } as ProviderAggregateRow)
      : null,
    models: models.map((m) => ({
      ...m,
      p95LatencyMs: modelP95.get(`${host}:::${m.model}`) ?? null,
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
      passRate: sql<number>`avg(cast(${testerTests.probesPassed} as real) / max(${testerTests.probesTotal}, 1))`,
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
  const agg = await db
    .select(AGG_SELECT)
    .from(testerTests)
    .where(
      and(
        eq(testerTests.baseUrlHost, host),
        eq(testerTests.requestedModel, model),
        isNotNull(testerTests.verifiedAt),
      ),
    )
    .groupBy(testerTests.baseUrlHost, testerTests.requestedModel)
    .limit(1);

  const recent = await db
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
    .where(
      and(
        eq(testerTests.baseUrlHost, host),
        eq(testerTests.requestedModel, model),
        isNotNull(testerTests.verifiedAt),
      ),
    )
    .orderBy(desc(testerTests.testedAt))
    .limit(20);

  const p95 = await p95ByGroup(
    and(
      eq(testerTests.baseUrlHost, host),
      eq(testerTests.requestedModel, model),
      isNotNull(testerTests.verifiedAt),
    ),
    true,
  );

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
