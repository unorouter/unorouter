import { getDb } from "@/lib/db/server/client";
import {
  publishedModels,
  publishedProviders,
  publishedTests,
} from "@/lib/db/schema/server";
import { GUEST_USER_ID } from "@/lib/config/constants";
import { runServerVerification } from "./server-verify.service";
import { and, desc, eq, gt, isNotNull, ne, sql } from "drizzle-orm";
import type {
  ProviderAggregateRow,
  RankingAggregateRow,
  RankingRecentRow,
  VerifyAndPublishBody,
} from "@/lib/api/typebox/model-tester";
import type { VerifyProviderValue } from "@/lib/validation/model-tester";
import type { VerifyResult } from "@/lib/ai/verify/types";

const DEDUPE_WINDOW_MS = 60_000;

// Find-or-create by the unique key (insert-ignore then select), then insert the
// test. provider value is the kind (anthropic|openai|gemini).
async function findOrCreateProvider(
  kind: VerifyProviderValue,
  host: string,
  testedAt: Date,
): Promise<string> {
  const db = getDb();
  await db
    .insert(publishedProviders)
    .values({
      kind,
      baseUrlHost: host,
      firstSeenAt: testedAt,
      lastTestedAt: testedAt,
    })
    .onConflictDoUpdate({
      target: [publishedProviders.kind, publishedProviders.baseUrlHost],
      set: { lastTestedAt: testedAt },
    });
  const rows = await db
    .select({ id: publishedProviders.id })
    .from(publishedProviders)
    .where(
      and(
        eq(publishedProviders.kind, kind),
        eq(publishedProviders.baseUrlHost, host),
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
    .insert(publishedModels)
    .values({ providerId, requestedModel, lastTestedAt: testedAt })
    .onConflictDoUpdate({
      target: [publishedModels.providerId, publishedModels.requestedModel],
      set: { lastTestedAt: testedAt },
    });
  const rows = await db
    .select({ id: publishedModels.id })
    .from(publishedModels)
    .where(
      and(
        eq(publishedModels.providerId, providerId),
        eq(publishedModels.requestedModel, requestedModel),
      ),
    )
    .limit(1);
  return rows[0]!.id;
}

// Server-verified publish: the server runs the WHOLE test itself, so the stored
// verdict cannot be forged by the client. A connectivity failure (handshake
// short-circuit) is not published.
export async function verifyAndPublish(
  body: VerifyAndPublishBody,
  submitterUserId: number | null,
  submitterUsername: string | null,
): Promise<
  | {
      published: true;
      deduped: false;
      // The full server-computed result so the client can keep a copy in its
      // local history (with the server's probe detail).
      result: VerifyResult;
    }
  | { published: false; deduped: true }
  | { published: false; error: string }
> {
  const db = getDb();
  const kind = body.provider;
  let host = body.baseUrl;
  try {
    host = new URL(body.baseUrl).host;
  } catch {
    host = body.baseUrl;
  }

  // Non-guest dedupe by host+model (the publish action, not the test).
  if (submitterUserId !== null && submitterUserId !== GUEST_USER_ID) {
    const since = new Date(Date.now() - DEDUPE_WINDOW_MS);
    const recent = await db
      .select({ id: publishedTests.id })
      .from(publishedTests)
      .where(
        and(
          eq(publishedTests.submitterUserId, submitterUserId),
          eq(publishedTests.baseUrlHost, host),
          eq(publishedTests.requestedModel, body.model),
          gt(publishedTests.createdAt, since),
        ),
      )
      .limit(1);
    if (recent[0]) return { published: false, deduped: true };
  }

  // The server itself issues the probes (unforgeable).
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

  await db.insert(publishedTests).values({
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
  return { published: true, deduped: false, result };
}

// Honest p95 per group, computed in ONE query (correlated subqueries against a
// GROUP BY column are fragile in SQLite, so we use a window-ranked CTE instead).
// `byHostModel` keys p95 per host+model (level 3 / model lists); otherwise per
// host (level 1 providers). Merge the result into the grouped rows app-side.
async function p95ByGroup(
  where: ReturnType<typeof and>,
  byHostModel: boolean,
): Promise<Map<string, number>> {
  const db = getDb();
  // Pull the scoped latencies + their group key, ordered; pick the 95th-pctile
  // index per group in JS (small data; avoids brittle correlated SQL).
  const rows = await db
    .select({
      host: publishedTests.baseUrlHost,
      model: publishedTests.requestedModel,
      latencyMs: publishedTests.latencyMs,
    })
    .from(publishedTests)
    .where(where)
    .orderBy(publishedTests.latencyMs);

  const groups = new Map<string, number[]>();
  for (const r of rows) {
    const key = byHostModel ? `${r.host}:::${r.model}` : r.host;
    const arr = groups.get(key);
    if (arr) arr.push(r.latencyMs);
    else groups.set(key, [r.latencyMs]);
  }
  const out = new Map<string, number>();
  for (const [key, arr] of groups) {
    // arr is globally latency-sorted; per-group order is preserved by the global
    // sort, so the per-group slice is already ascending.
    const idx = Math.floor(0.95 * (arr.length - 1));
    out.set(key, arr[idx]!);
  }
  return out;
}

const AGG_SELECT = {
  provider: sql<VerifyProviderValue>`max(${publishedTests.kind})`,
  model: publishedTests.requestedModel,
  baseUrlHost: publishedTests.baseUrlHost,
  sampleCount: sql<number>`count(*)`,
  avgPassRate: sql<number>`avg(cast(${publishedTests.probesPassed} as real) / max(${publishedTests.probesTotal}, 1))`,
  avgLatencyMs: sql<number>`avg(${publishedTests.latencyMs})`,
  avgTotalTokens: sql<number | null>`avg(${publishedTests.totalTokens})`,
  genuineCount: sql<number>`sum(case when ${publishedTests.verdict} = 'genuine' then 1 else 0 end)`,
  suspiciousCount: sql<number>`sum(case when ${publishedTests.verdict} = 'suspicious' then 1 else 0 end)`,
  unverifiedCount: sql<number>`sum(case when ${publishedTests.verdict} = 'unverified' then 1 else 0 end)`,
  lastTestedAt: sql<number>`max(${publishedTests.testedAt})`,
};

const PROVIDER_SELECT = {
  provider: sql<VerifyProviderValue>`max(${publishedTests.kind})`,
  baseUrlHost: publishedTests.baseUrlHost,
  modelCount: sql<number>`count(distinct ${publishedTests.requestedModel})`,
  sampleCount: sql<number>`count(*)`,
  avgPassRate: sql<number>`avg(cast(${publishedTests.probesPassed} as real) / max(${publishedTests.probesTotal}, 1))`,
  avgLatencyMs: sql<number>`avg(${publishedTests.latencyMs})`,
  avgTotalTokens: sql<number | null>`avg(${publishedTests.totalTokens})`,
  genuineCount: sql<number>`sum(case when ${publishedTests.verdict} = 'genuine' then 1 else 0 end)`,
  suspiciousCount: sql<number>`sum(case when ${publishedTests.verdict} = 'suspicious' then 1 else 0 end)`,
  unverifiedCount: sql<number>`sum(case when ${publishedTests.verdict} = 'unverified' then 1 else 0 end)`,
  lastTestedAt: sql<number>`max(${publishedTests.testedAt})`,
};

const PASS_RATE_SQL = sql`avg(cast(${publishedTests.probesPassed} as real) / max(${publishedTests.probesTotal}, 1))`;

// Level 1: PROVIDERS grouped by host. Each row is one provider with its model
// count + aggregate stats.
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
    .from(publishedTests)
    .where(isNotNull(publishedTests.verifiedAt))
    .groupBy(publishedTests.baseUrlHost)
    .orderBy(desc(PASS_RATE_SQL))
    .limit(pageSize)
    .offset(offset);

  const distinct = await db
    .select({
      c: sql<number>`count(distinct ${publishedTests.baseUrlHost})`,
    })
    .from(publishedTests)
    .where(isNotNull(publishedTests.verifiedAt));

  const p95 = await p95ByGroup(isNotNull(publishedTests.verifiedAt), false);

  return {
    rows: rows.map((r) => ({
      ...r,
      p95LatencyMs: p95.get(r.baseUrlHost) ?? null,
    })) as ProviderAggregateRow[],
    total: distinct[0]?.c ?? 0,
    page,
    pageSize,
  };
}

// Level 2: one provider's aggregate + the list of MODELS it serves.
export async function getProviderDetail(host: string): Promise<{
  provider: ProviderAggregateRow | null;
  models: RankingAggregateRow[];
}> {
  const db = getDb();
  const where = and(
    eq(publishedTests.baseUrlHost, host),
    isNotNull(publishedTests.verifiedAt),
  );

  const provider = await db
    .select(PROVIDER_SELECT)
    .from(publishedTests)
    .where(where)
    .groupBy(publishedTests.baseUrlHost)
    .limit(1);

  const models = await db
    .select(AGG_SELECT)
    .from(publishedTests)
    .where(where)
    .groupBy(publishedTests.requestedModel)
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
      providers: sql<number>`count(distinct ${publishedTests.baseUrlHost})`,
      passRate: sql<number>`avg(cast(${publishedTests.probesPassed} as real) / max(${publishedTests.probesTotal}, 1))`,
    })
    .from(publishedTests)
    .where(isNotNull(publishedTests.verifiedAt));
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
    .from(publishedTests)
    .where(
      and(
        eq(publishedTests.baseUrlHost, host),
        eq(publishedTests.requestedModel, model),
        isNotNull(publishedTests.verifiedAt),
      ),
    )
    .groupBy(publishedTests.baseUrlHost, publishedTests.requestedModel)
    .limit(1);

  const recent = await db
    .select({
      id: publishedTests.id,
      verdict: publishedTests.verdict,
      detectedModel: publishedTests.detectedModel,
      probesPassed: publishedTests.probesPassed,
      probesTotal: publishedTests.probesTotal,
      latencyMs: publishedTests.latencyMs,
      totalTokens: publishedTests.totalTokens,
      transport: publishedTests.transport,
      testedAt: publishedTests.testedAt,
      submitterUserId: publishedTests.submitterUserId,
      submitterUsername: publishedTests.submitterUsername,
    })
    .from(publishedTests)
    .where(
      and(
        eq(publishedTests.baseUrlHost, host),
        eq(publishedTests.requestedModel, model),
        isNotNull(publishedTests.verifiedAt),
      ),
    )
    .orderBy(desc(publishedTests.testedAt))
    .limit(20);

  const p95 = await p95ByGroup(
    and(
      eq(publishedTests.baseUrlHost, host),
      eq(publishedTests.requestedModel, model),
      isNotNull(publishedTests.verifiedAt),
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

// Submitter self-retract: a logged-in user can delete a row THEY published. The
// guest sentinel (GUEST_USER_ID) is never a valid owner, so guest-published rows
// can only be removed via the report channel. The ownership check is in the WHERE
// (not just the UI) so the route cannot be abused.
export async function deletePublishedTest(
  id: string,
  userId: number | null,
): Promise<{ deleted: boolean }> {
  if (userId === null || userId === GUEST_USER_ID) return { deleted: false };
  const db = getDb();
  const rows = await db
    .delete(publishedTests)
    .where(
      and(
        eq(publishedTests.id, id),
        eq(publishedTests.submitterUserId, userId),
        ne(publishedTests.submitterUserId, GUEST_USER_ID),
      ),
    )
    .returning({ id: publishedTests.id });
  return { deleted: rows.length > 0 };
}
