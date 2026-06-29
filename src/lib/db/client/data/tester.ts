"use client";

import { GUEST_USER_ID } from "@/lib/config/constants";
import {
  testerModels,
  testerProbes,
  testerProviders,
  testerTests,
} from "@/lib/db/schema/client";
import { uid as genId } from "@/lib/utils/base";
import { and, desc, eq, sql } from "drizzle-orm";
import { getLocalDb } from "../client";
import type { TesterProbeRow, TesterTestRow } from "@/lib/db/schema/rows";
import type { VerifyResult } from "@/lib/ai/verify/types";
import type { VerifyProviderValue } from "@/lib/validation/model-tester";

// Aggregate rows for the grouped history (mirrors the rankings hierarchy).
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
  lastVerdict: string | null;
  lastTestedAt: Date;
};

// A history-list item: the test joined to its provider + model for display.
export type TestListItem = {
  id: string;
  provider: VerifyProviderValue;
  baseUrlHost: string;
  requestedModel: string;
  detectedModel: string | null;
  verdict: TesterTestRow["verdict"];
  probesPassed: number;
  probesTotal: number;
  latencyMs: number;
  testedAt: Date;
  publishedAt: Date | null;
};

export type TestDetail = {
  test: TesterTestRow;
  provider: { kind: VerifyProviderValue; baseUrlHost: string };
  model: { requestedModel: string };
  probes: TesterProbeRow[];
};

// find-or-create by unique key: INSERT OR IGNORE then SELECT.
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

// Persist a finished run: provider -> model -> test -> probes. Returns the test id.
export async function recordTestRun(
  userId: number | undefined,
  result: VerifyResult,
  publish: boolean,
): Promise<string> {
  const uid = userId ?? GUEST_USER_ID;
  const local = await getLocalDb(uid);
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
    testedAt: now,
    publishedAt: publish ? now : null,
  });

  // No tx (SQLocal mutex rule); plain inserts.
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
      signal: p.signal,
      reason: p.reason,
      promptTokens: p.usage?.prompt ?? null,
      completionTokens: p.usage?.completion ?? null,
      latencyMs: p.latencyMs,
    });
  }
  return testId;
}

export async function readTestHistory(
  userId: number | undefined,
): Promise<TestListItem[]> {
  const uid = userId ?? GUEST_USER_ID;
  const local = await getLocalDb(uid);
  if (!local) return [];
  const rows = await local.db
    .select({
      id: testerTests.id,
      provider: testerProviders.kind,
      baseUrlHost: testerProviders.baseUrlHost,
      requestedModel: testerModels.requestedModel,
      detectedModel: testerTests.detectedModel,
      verdict: testerTests.verdict,
      probesPassed: testerTests.probesPassed,
      probesTotal: testerTests.probesTotal,
      latencyMs: testerTests.latencyMs,
      testedAt: testerTests.testedAt,
      publishedAt: testerTests.publishedAt,
    })
    .from(testerTests)
    .innerJoin(testerModels, eq(testerModels.id, testerTests.modelId))
    .innerJoin(testerProviders, eq(testerProviders.id, testerTests.providerId))
    .where(eq(testerTests.userId, uid))
    .orderBy(desc(testerTests.testedAt));
  return rows as TestListItem[];
}

// Level 1: the user's providers (grouped by host) with aggregate stats.
export async function readHistoryProviders(
  userId: number | undefined,
): Promise<HistoryProviderRow[]> {
  const uid = userId ?? GUEST_USER_ID;
  const local = await getLocalDb(uid);
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
  })) as HistoryProviderRow[];
}

// Level 2: one provider's models with aggregate stats.
export async function readHistoryModels(
  userId: number | undefined,
  host: string,
): Promise<{
  provider: VerifyProviderValue | null;
  models: HistoryModelRow[];
}> {
  const uid = userId ?? GUEST_USER_ID;
  const local = await getLocalDb(uid);
  if (!local) return { provider: null, models: [] };
  const rows = await local.db
    .select({
      baseUrlHost: testerProviders.baseUrlHost,
      provider: sql<VerifyProviderValue>`max(${testerProviders.kind})`,
      requestedModel: testerModels.requestedModel,
      sampleCount: sql<number>`count(*)`,
      avgPassRate: sql<number>`avg(cast(${testerTests.probesPassed} as real) / max(${testerTests.probesTotal}, 1))`,
      avgLatencyMs: sql<number>`avg(${testerTests.latencyMs})`,
      lastVerdict: sql<string | null>`max(${testerModels.lastVerdict})`,
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
  })) as HistoryModelRow[];
  return { provider: models[0]?.provider ?? null, models };
}

// Level 3: every test for one provider+model (the user's runs).
export async function readHistoryModelTests(
  userId: number | undefined,
  host: string,
  model: string,
): Promise<TestListItem[]> {
  const uid = userId ?? GUEST_USER_ID;
  const local = await getLocalDb(uid);
  if (!local) return [];
  const rows = await local.db
    .select({
      id: testerTests.id,
      provider: testerProviders.kind,
      baseUrlHost: testerProviders.baseUrlHost,
      requestedModel: testerModels.requestedModel,
      detectedModel: testerTests.detectedModel,
      verdict: testerTests.verdict,
      probesPassed: testerTests.probesPassed,
      probesTotal: testerTests.probesTotal,
      latencyMs: testerTests.latencyMs,
      testedAt: testerTests.testedAt,
      publishedAt: testerTests.publishedAt,
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
  return rows as TestListItem[];
}

export async function readTestDetail(
  userId: number | undefined,
  testId: string,
): Promise<TestDetail | null> {
  const uid = userId ?? GUEST_USER_ID;
  const local = await getLocalDb(uid);
  if (!local) return null;
  const db = local.db;

  const tests = await db
    .select()
    .from(testerTests)
    .where(and(eq(testerTests.id, testId), eq(testerTests.userId, uid)))
    .limit(1);
  const test = tests[0];
  if (!test) return null;

  const prov = await db
    .select({
      kind: testerProviders.kind,
      baseUrlHost: testerProviders.baseUrlHost,
    })
    .from(testerProviders)
    .where(eq(testerProviders.id, test.providerId))
    .limit(1);
  const model = await db
    .select({ requestedModel: testerModels.requestedModel })
    .from(testerModels)
    .where(eq(testerModels.id, test.modelId))
    .limit(1);
  const probes = await db
    .select()
    .from(testerProbes)
    .where(eq(testerProbes.testId, testId))
    .orderBy(testerProbes.orderIndex);

  return {
    test,
    provider: prov[0] ?? { kind: "", baseUrlHost: "" },
    model: model[0] ?? { requestedModel: "" },
    probes,
  };
}

export async function markTestPublished(
  userId: number | undefined,
  testId: string,
): Promise<void> {
  const uid = userId ?? GUEST_USER_ID;
  const local = await getLocalDb(uid);
  if (!local) return;
  await local.db
    .update(testerTests)
    .set({ publishedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(testerTests.id, testId), eq(testerTests.userId, uid)));
}

export async function deleteTest(
  userId: number | undefined,
  testId: string,
): Promise<void> {
  const uid = userId ?? GUEST_USER_ID;
  const local = await getLocalDb(uid);
  if (!local) return;
  // Probes cascade via FK ON DELETE CASCADE.
  await local.db
    .delete(testerTests)
    .where(and(eq(testerTests.id, testId), eq(testerTests.userId, uid)));
}
