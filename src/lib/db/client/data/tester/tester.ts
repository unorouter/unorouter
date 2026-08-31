"use client";

import { GUEST_USER_ID } from "@/lib/config/constants";
import {
  testerModels,
  testerProbes,
  testerProviders,
  testerTests,
} from "@/lib/db/schema/tester";
import { uid as genId } from "@/lib/utils/base";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getLocalDb } from "@/lib/db/client/client";
import type { TesterProbeRow, TesterTestRow } from "@/lib/db/schema/rows";
import type { VerifyResult } from "@unorouter/verify-core/types";
import type { VerifyProviderValue } from "@/lib/validation/model-tester";
import type { TestResultDetail } from "@/lib/api/typebox/model-tester";

export type HistoryProviderRow = {
  baseUrlHost: string;
  provider: VerifyProviderValue;
  modelCount: number;
  sampleCount: number;
  avgPassRate: number;
  avgLatencyMs: number;
  lastTestedAt: Date;
};

export type HistoryModelRow = {
  baseUrlHost: string;
  provider: VerifyProviderValue;
  requestedModel: string;
  sampleCount: number;
  avgPassRate: number;
  avgLatencyMs: number;
  lastTestedAt: Date;
};

function toTestResultDetail(
  test: TesterTestRow,
  provider: { kind: VerifyProviderValue; baseUrlHost: string },
  model: { requestedModel: string },
  probes: TesterProbeRow[],
): TestResultDetail {
  return {
    model: model.requestedModel,
    baseUrlHost: provider.baseUrlHost,
    provider: provider.kind,
    verdict: test.verdict,
    versionUnverifiable: test.versionUnverifiable,
    detectedModel: test.detectedModel,
    probesPassed: test.probesPassed,
    probesTotal: test.probesTotal,
    totalTokens: test.totalTokens,
    latencyMs: test.latencyMs,
    transport: test.transport,
    resolvedFormat: test.resolvedFormat ?? provider.kind,
    formatFellBack: test.formatFellBack,
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

async function findOrCreateProvider(
  db: NonNullable<Awaited<ReturnType<typeof getLocalDb>>>["db"],
  userId: number,
  result: VerifyResult,
  now: Date,
): Promise<string> {
  const existing = await db
    .select({ id: testerProviders.id })
    .from(testerProviders)
    .where(
      and(
        eq(testerProviders.userId, userId),
        eq(testerProviders.kind, result.provider),
        eq(testerProviders.baseUrlHost, result.baseUrlHost),
      ),
    )
    .limit(1);
  if (existing[0]) {
    await db
      .update(testerProviders)
      .set({ lastTestedAt: now, updatedAt: now })
      .where(eq(testerProviders.id, existing[0].id));
    return existing[0].id;
  }
  const id = genId();
  await db.insert(testerProviders).values({
    id,
    userId,
    kind: result.provider,
    baseUrlHost: result.baseUrlHost,
    firstSeenAt: now,
    lastTestedAt: now,
  });
  return id;
}

async function findOrCreateModel(
  db: NonNullable<Awaited<ReturnType<typeof getLocalDb>>>["db"],
  userId: number,
  providerId: string,
  result: VerifyResult,
  now: Date,
): Promise<string> {
  const existing = await db
    .select({ id: testerModels.id })
    .from(testerModels)
    .where(
      and(
        eq(testerModels.providerId, providerId),
        eq(testerModels.requestedModel, result.model),
      ),
    )
    .limit(1);
  if (existing[0]) {
    await db
      .update(testerModels)
      .set({
        lastDetectedModel: result.detectedModel,
        lastVerdict: result.verdict,
        lastTestedAt: now,
        updatedAt: now,
      })
      .where(eq(testerModels.id, existing[0].id));
    return existing[0].id;
  }
  const id = genId();
  await db.insert(testerModels).values({
    id,
    userId,
    providerId,
    requestedModel: result.model,
    lastDetectedModel: result.detectedModel,
    lastVerdict: result.verdict,
    lastTestedAt: now,
  });
  return id;
}

export async function recordTestRun(
  userId: number | undefined,
  result: VerifyResult,
  publish: boolean,
): Promise<string> {
  const uid = userId ?? GUEST_USER_ID;
  const local = await getLocalDb();
  if (!local) return "";
  const db = local.db;
  const now = new Date();

  const providerId = await findOrCreateProvider(db, uid, result, now);
  const modelId = await findOrCreateModel(db, uid, providerId, result, now);

  const testId = genId();
  await db.insert(testerTests).values({
    id: testId,
    userId: uid,
    modelId,
    providerId,
    verdict: result.verdict,
    versionUnverifiable: result.versionUnverifiable,
    detectedModel: result.detectedModel,
    probesPassed: result.probesPassed,
    probesTotal: result.probesTotal,
    promptTokens: result.totalUsage?.prompt ?? null,
    completionTokens: result.totalUsage?.completion ?? null,
    totalTokens: result.totalUsage?.total ?? null,
    latencyMs: result.latencyMs,
    transport: result.transport,
    resolvedFormat: result.resolvedProvider,
    formatFellBack: result.resolvedProvider !== result.provider,
    testedAt: now,
    publishedAt: publish ? now : null,
  });

  for (let i = 0; i < result.probes.length; i++) {
    const p = result.probes[i]!;
    await db.insert(testerProbes).values({
      id: genId(),
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
  return testId;
}

export async function readHistoryProviders(
  userId: number | undefined,
): Promise<HistoryProviderRow[]> {
  const uid = userId ?? GUEST_USER_ID;
  const local = await getLocalDb();
  if (!local) return [];
  const rows = await local.db
    .select({
      baseUrlHost: testerProviders.baseUrlHost,
      provider: sql<VerifyProviderValue>`max(${testerProviders.kind})`,
      modelCount: sql<number>`count(distinct ${testerModels.requestedModel})`,
      sampleCount: sql<number>`count(*)`,
      avgPassRate: sql<number>`avg(cast(${testerTests.probesPassed} as real) / max(${testerTests.probesTotal}, 1))`,
      avgLatencyMs: sql<number>`avg(${testerTests.latencyMs})`,
      lastTestedAt: sql<Date>`max(${testerTests.testedAt})`,
    })
    .from(testerTests)
    .innerJoin(testerModels, eq(testerModels.id, testerTests.modelId))
    .innerJoin(testerProviders, eq(testerProviders.id, testerTests.providerId))
    .where(eq(testerTests.userId, uid))
    .groupBy(testerProviders.baseUrlHost)
    .orderBy(desc(sql`max(${testerTests.testedAt})`));
  return rows.map((r) => ({
    ...r,
    lastTestedAt: new Date(r.lastTestedAt),
  }));
}

export async function readHistoryModels(
  userId: number | undefined,
  host: string,
): Promise<{
  provider: VerifyProviderValue | null;
  models: HistoryModelRow[];
}> {
  const uid = userId ?? GUEST_USER_ID;
  const local = await getLocalDb();
  if (!local) return { provider: null, models: [] };
  const rows = await local.db
    .select({
      baseUrlHost: testerProviders.baseUrlHost,
      provider: sql<VerifyProviderValue>`max(${testerProviders.kind})`,
      requestedModel: testerModels.requestedModel,
      sampleCount: sql<number>`count(*)`,
      avgPassRate: sql<number>`avg(cast(${testerTests.probesPassed} as real) / max(${testerTests.probesTotal}, 1))`,
      avgLatencyMs: sql<number>`avg(${testerTests.latencyMs})`,
      lastTestedAt: sql<Date>`max(${testerTests.testedAt})`,
    })
    .from(testerTests)
    .innerJoin(testerModels, eq(testerModels.id, testerTests.modelId))
    .innerJoin(testerProviders, eq(testerProviders.id, testerTests.providerId))
    .where(
      and(eq(testerTests.userId, uid), eq(testerProviders.baseUrlHost, host)),
    )
    .groupBy(testerModels.requestedModel)
    .orderBy(desc(sql`max(${testerTests.testedAt})`));
  const models = rows.map((r) => ({
    ...r,
    lastTestedAt: new Date(r.lastTestedAt),
  }));
  return { provider: models[0]?.provider ?? null, models };
}

export type HistoryTestDetail = TestResultDetail & { id: string };

export async function readHistoryModelTestDetails(
  userId: number | undefined,
  host: string,
  model: string,
): Promise<HistoryTestDetail[]> {
  const uid = userId ?? GUEST_USER_ID;
  const local = await getLocalDb();
  if (!local) return [];
  const db = local.db;

  const tests = await db
    .select({
      test: testerTests,
      kind: testerProviders.kind,
      baseUrlHost: testerProviders.baseUrlHost,
      requestedModel: testerModels.requestedModel,
    })
    .from(testerTests)
    .innerJoin(testerModels, eq(testerModels.id, testerTests.modelId))
    .innerJoin(testerProviders, eq(testerProviders.id, testerTests.providerId))
    .where(
      and(
        eq(testerTests.userId, uid),
        eq(testerProviders.baseUrlHost, host),
        eq(testerModels.requestedModel, model),
      ),
    )
    .orderBy(desc(testerTests.testedAt));
  if (tests.length === 0) return [];

  const ids = tests.map((r) => r.test.id);
  const probes = await db
    .select()
    .from(testerProbes)
    .where(inArray(testerProbes.testId, ids))
    .orderBy(testerProbes.orderIndex);
  const byTest = new Map<string, TesterProbeRow[]>();
  for (const p of probes) {
    const list = byTest.get(p.testId) ?? [];
    list.push(p);
    byTest.set(p.testId, list);
  }

  return tests.map((r) => ({
    id: r.test.id,
    ...toTestResultDetail(
      r.test,
      { kind: r.kind, baseUrlHost: r.baseUrlHost },
      { requestedModel: r.requestedModel },
      byTest.get(r.test.id) ?? [],
    ),
  }));
}

export async function deleteTest(
  userId: number | undefined,
  testId: string,
): Promise<void> {
  const uid = userId ?? GUEST_USER_ID;
  const local = await getLocalDb();
  if (!local) return;
  await local.db
    .delete(testerTests)
    .where(and(eq(testerTests.id, testId), eq(testerTests.userId, uid)));
}
