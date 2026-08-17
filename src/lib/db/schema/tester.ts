// Model-tester tables: the ONE schema definition serving BOTH databases. The
// client holds a user's private test history under their real userId; the server
// holds the public leaderboard written with userId = GUEST_USER_ID, so the
// unique (userId, kind, baseUrlHost) key acts as a global (kind, host) there.
//
// Split out of shared.ts because drizzle.server.config.ts generates Turso
// migrations from schema/index.ts: while that re-exported shared.ts, editing a
// CHAT table emitted a destructive server migration against tables no server
// code has ever read.
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { uid } from "@/lib/utils/base";
import type {
  VerifyProviderValue,
  VerifyVerdictValue,
} from "@/lib/validation/model-tester";
import { timestamps } from "./shared";

export const testerProviders = sqliteTable(
  "tester_providers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    userId: integer("user_id").notNull(),
    kind: text("kind").$type<VerifyProviderValue>().notNull(),
    baseUrlHost: text("base_url_host").notNull(),
    label: text("label"),
    firstSeenAt: integer("first_seen_at", { mode: "timestamp_ms" }).notNull(),
    lastTestedAt: integer("last_tested_at", { mode: "timestamp_ms" }).notNull(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("uq_tester_provider").on(
      table.userId,
      table.kind,
      table.baseUrlHost,
    ),
  ],
);

export const testerModels = sqliteTable(
  "tester_models",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    userId: integer("user_id").notNull(),
    providerId: text("provider_id")
      .notNull()
      .references(() => testerProviders.id, { onDelete: "cascade" }),
    requestedModel: text("requested_model").notNull(),
    lastDetectedModel: text("last_detected_model"),
    lastVerdict: text("last_verdict").$type<VerifyVerdictValue>(),
    lastTestedAt: integer("last_tested_at", { mode: "timestamp_ms" }).notNull(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("uq_tester_model").on(table.providerId, table.requestedModel),
  ],
);

export const testerTests = sqliteTable(
  "tester_tests",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    userId: integer("user_id").notNull(),
    modelId: text("model_id")
      .notNull()
      .references(() => testerModels.id, { onDelete: "cascade" }),
    providerId: text("provider_id").notNull(),
    verdict: text("verdict").$type<VerifyVerdictValue>().notNull(),
    versionUnverifiable: integer("version_unverifiable", { mode: "boolean" })
      .notNull()
      .default(false),
    detectedModel: text("detected_model"),
    probesPassed: integer("probes_passed").notNull().default(0),
    probesTotal: integer("probes_total").notNull().default(0),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    totalTokens: integer("total_tokens"),
    latencyMs: integer("latency_ms").notNull().default(0),
    transport: text("transport").notNull().default("direct"),
    resolvedFormat: text("resolved_format"),
    formatFellBack: integer("format_fell_back", { mode: "boolean" })
      .notNull()
      .default(false),
    testedAt: integer("tested_at", { mode: "timestamp_ms" }).notNull(),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    submitterUserId: integer("submitter_user_id"),
    submitterUsername: text("submitter_username"),
    verifiedAt: integer("verified_at", { mode: "timestamp_ms" }),
    kind: text("kind").$type<VerifyProviderValue>(),
    baseUrlHost: text("base_url_host"),
    requestedModel: text("requested_model"),
    ...timestamps(),
  },
  (table) => [
    index("idx_tester_test_user_tested").on(table.userId, table.testedAt),
    index("idx_tester_test_model").on(table.modelId),
    index("idx_tester_test_published").on(table.publishedAt),
    index("idx_tester_test_verified").on(table.verifiedAt),
    index("idx_tester_test_host_model").on(
      table.baseUrlHost,
      table.requestedModel,
    ),
    index("idx_tester_test_submitter").on(
      table.submitterUserId,
      table.baseUrlHost,
      table.requestedModel,
    ),
  ],
);

export const testerProbes = sqliteTable(
  "tester_probes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uid()),
    testId: text("test_id")
      .notNull()
      .references(() => testerTests.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull().default(0),
    label: text("label").notNull(),
    prompt: text("prompt").notNull(),
    responseText: text("response_text"),
    httpStatus: integer("http_status"),
    pass: integer("pass", { mode: "boolean" }).notNull().default(false),
    transient: integer("transient", { mode: "boolean" })
      .notNull()
      .default(false),
    signal: text("signal"),
    reason: text("reason"),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    latencyMs: integer("latency_ms").notNull().default(0),
  },
  (table) => [
    index("idx_tester_probe_test").on(table.testId, table.orderIndex),
  ],
);
