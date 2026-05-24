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

export type MessageUsage = {
  inputTokens: number;
  outputTokens: number;
  cost: number;
  durationMs?: number;
  tokensPerSecond?: number;
};

// Carried in `messageMetadata` finish frame so the client can persist a
// request_log row keyed by msgId. Usage fields ride on `MessageUsage` already;
// derive from the schema row so the two sides cannot drift.
export type RequestLogPayload = Omit<
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

// A playground snapshot row plus its resolved images, as the playground UI
// consumes it. `params`/`loras`/`references`/`extraParams` stay loose because
// older synced rows may carry extra keys.
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

// Restore-payload shape shared by the result view and the form draft restore.
export type SnapshotRestoreFields = {
  model: string;
  prompt: string;
  negativePrompt: string | null;
  params: Record<string, unknown> | null;
  loras: unknown;
  references: unknown;
  extraParams: Record<string, unknown> | null;
};

// Flat editor-selection state used by the RP entity pages/lists: an entity id
// being edited, "new" for a fresh entity, or null when none is open.
export type EntityEditId = string | "new" | null;

// Two-factor-auth dialog mode, shared by the settings card and its dialog.
export type TwoFAMode = "setup" | "disable";

type MigrationEntry = { tag: string; sql: string };
export type MigrationManifest = { migrations: MigrationEntry[] };

export type LocalDb = SqliteRemoteDatabase<typeof shared & typeof client>;

// Returns rows + column names (drizzle-proxy returns tuples only). Used by
// LocalDbStudio for arbitrary user-supplied SQL.
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

// Lives outside `config/constants.ts` to avoid an import cycle with
// `config/env.ts`, which throws ParamErrors at module-load time.
export class ParamError extends Error {
  public readonly params: Record<string, string | number>;
  constructor(key: TranslationKey, params: Record<string, string | number>) {
    super(key);
    this.name = "ParamError";
    this.params = params;
  }
}
