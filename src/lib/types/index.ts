import type * as client from "@/lib/db/schema/client";
import type * as shared from "@/lib/db/schema/shared";
import type { RequestLogRow } from "@/lib/db/schema/rows";
import type { UIMessage } from "ai";
import type { SQL } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import type { SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import type { useTranslations } from "next-intl";

export type TranslationKey = Parameters<
  ReturnType<typeof useTranslations<never>>
>[0];

export type DashToUnderscore<S extends string> =
  S extends `${infer A}-${infer B}` ? `${A}_${B}` : S;

export type LogContext = { context?: string; [key: string]: unknown };

export type Extracted = {
  message: string;
  params?: Record<string, string | number>;
};

export type StatusBucket = "1m" | "5m" | "15m" | "1h" | "1d";

type MessageUsage = {
  inputTokens: number;
  outputTokens: number;
  cost: number;
  durationMs?: number;
  tokensPerSecond?: number;
};

// messageMetadata finish-frame; derived from RequestLogRow so wire shape can't drift.
type RequestLogPayload = Omit<
  RequestLogRow,
  | "msgId"
  | "convId"
  | "createdAt"
  | "inputTokens"
  | "outputTokens"
  | "cost"
  | "durationMs"
  | "tokensPerSecond"
>;

// Mirror of the `messageMetadata` shape emitted by stream.service finish frame.
export type ChatMessageMetadata = {
  usage?: MessageUsage;
  droppedParams?: string;
  debug?: RequestLogPayload;
  // Serialized chat-variable map (JSON string) emitted when macro setvar/addvar
  // changed it this turn. The history adapter persists it to conversation vars.
  vars?: string;
  // Serialized per-user global-variable map (setglobalvar). Persisted to the
  // user's global-var store (userVars sync kind) by the history adapter.
  globalVars?: string;
  // Rolling-summary memory update: the running summary + how many leading
  // messages it now covers. Persisted to conversation summaryMemory/anchor.
  summary?: { summary: string; anchor: number };
  // Which character spoke this turn (multi-character rotation). Rides the
  // finish frame because the rotation loop clears the speaking atom before
  // the history adapter persists, so an atom read at append time races.
  speakingCharacterId?: string;
};

export type ChatUIMessage = UIMessage<ChatMessageMetadata>;

export type EditorState = { mode: "list" } | { mode: "edit"; id?: string };

// A generated playground image resolved for rendering: `src` is a data URI
// (base64 priority) or the R2 URL fallback.
export type PlaygroundImageView = {
  id: string;
  sequenceIndex: number;
  src: string;
  mimeType: string | null;
  width: number | null;
  height: number | null;
};

// Playground snapshot + resolved images. Loose params for legacy synced rows.
export type SnapshotView = {
  id: string;
  sessionId: string;
  sessionOrder: number;
  model: string;
  prompt: string;
  negativePrompt: string | null;
  params: Record<string, unknown> | null;
  loras: unknown;
  references: unknown;
  extraParams: Record<string, unknown> | null;
  status: string;
  progress: string | null;
  taskId: string | null;
  requestedCount: number;
  errorMessage: string | null;
  expiresAt: Date | null;
  createdAt: Date | null;
  images: PlaygroundImageView[];
};

// RP entity-page selection: id, "new", or null.
export type EntityEditId = string | "new" | null;

// Two-factor-auth dialog mode, shared by the settings card and its dialog.
export type TwoFAMode = "setup" | "disable";

type MigrationEntry = { tag: string; sql: string };
export type MigrationManifest = { migrations: MigrationEntry[] };

export type LocalDb = SqliteRemoteDatabase<typeof shared & typeof client>;

// drizzle-proxy returns tuples only; LocalDbStudio needs rows+columns.
export type LocalRawExec = (
  sql: string,
  params: unknown[],
  method?: "all" | "run" | "get" | "values",
) => Promise<{
  rows: unknown[][];
  columns: string[];
  numAffectedRows?: number;
}>;

export type LocalClient = {
  db: LocalDb;
  exec: LocalRawExec;
  transaction: <T>(cb: () => Promise<T>) => Promise<T>;
  destroy: () => Promise<void>;
  deleteDatabaseFile: () => Promise<void>;
  getDatabaseFile: () => Promise<File>;
  overwriteDatabaseFile: (file: File | Blob) => Promise<void>;
  reactiveQuery: (query: unknown) => {
    subscribe: (
      onData: (data: unknown) => void,
      onError?: (err: unknown) => void,
    ) => { unsubscribe: () => void };
  };
};

export type CopyRowFailure = {
  table: string;
  row: Record<string, unknown>;
  error: unknown;
};

export type CopyOptions = {
  rewrite?: Record<string, unknown>;
  skipTables?: readonly string[];
  onRowError?: (e: CopyRowFailure) => void;
};

export type CopyResult = {
  copied: number;
  failures: CopyRowFailure[];
  tables: string[];
};

// makeTableStore (src/lib/db/client/data/table-store.ts).
export type ScopedTable = SQLiteTable & { userId?: SQLiteColumn };
export type StoreListOpts = {
  orderBy?: SQL | SQLiteColumn;
  scopeUser?: boolean;
};
export type StoreRowOpts = { scopeUser?: boolean };
export type StoreConfig = { defaultOrderBy?: SQL | SQLiteColumn };
export type StoreRow = Record<string, unknown>;
export type StorePkValue = string | number;

export type SearchResult = {
  title: string;
  description: string;
  url: string;
  category: string;
};

export function isSearchDoc(doc: unknown): doc is SearchResult {
  if (typeof doc !== "object" || doc === null) return false;
  const d = doc as Record<string, unknown>;
  return typeof d.title === "string" && typeof d.url === "string";
}

// Generic loose-shape bundle inputs (sqlite-proxy cast boundary).
// Co-located for assembler + lorebook selectors.
export type LocalAnyRow = Record<string, unknown> & { id: string };
export type LocalChildRow = Record<string, unknown>;
export type LocalRowInput = Record<string, unknown>;

import type { loadConvContext } from "@/server/ai/chat/augmentation/prompt-assembler/conv-context";
export type LoadedConvContext = Awaited<ReturnType<typeof loadConvContext>>;

export type LbEntry = LoadedConvContext extends infer T
  ? T extends { lbEntries: infer E }
    ? E extends ReadonlyArray<infer Item>
      ? Item
      : never
    : never
  : never;

export type LbRow = LoadedConvContext extends infer T
  ? T extends { lbRows: infer R }
    ? R extends ReadonlyArray<infer Item>
      ? Item
      : never
    : never
  : never;

// Outside config/constants.ts: env.ts ParamError throws at module load (import cycle).
export class ParamError extends Error {
  public readonly params: Record<string, string | number>;
  constructor(key: TranslationKey, params: Record<string, string | number>) {
    super(key);
    this.name = "ParamError";
    this.params = params;
  }
}
