import type { Pathname, pathnames } from "@/i18n/routing";
import type * as client from "@/lib/db/schema/client";
import type * as shared from "@/lib/db/schema/shared";
import type {
  CharacterRow,
  LorebookEntryRow,
  LorebookRow,
  PersonaRow,
  PresetRow,
  RequestLogRow,
} from "@/lib/db/schema/rows";
import type { ConversationSettingsProjection } from "@/lib/db/conversation-settings";
import type { UIMessage } from "ai";
import type { SQL } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import type { SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import type { MetadataRoute } from "next";
import type { useTranslations } from "next-intl";
import type { ComponentType } from "react";

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

export type ChatMessageMetadata = {
  usage?: MessageUsage;
  droppedParams?: string;
  debug?: RequestLogPayload;
  vars?: string;
  globalVars?: string;
  summary?: { summary: string; anchor: number };
  inlayMedia?: {
    id: string;
    dataBase64: string;
    mimeType: string;
    sizeBytes: number;
  }[];
  speakingCharacterId?: string;
};

export type ChatUIMessage = UIMessage<ChatMessageMetadata>;

export type EditorState = { mode: "list" } | { mode: "edit"; id?: string };

export type EntityEditId = string | "new" | null;

export type TwoFAMode = "setup" | "disable";

type MigrationEntry = { tag: string; sql: string };
export type MigrationManifest = { migrations: MigrationEntry[] };

export type LocalDb = SqliteRemoteDatabase<typeof shared & typeof client>;

export type LocalRawExec = (
  sql: string,
  params: unknown[],
  method?: "all" | "run" | "get" | "values",
) => Promise<{
  rows: unknown[][];
  columns: string[];
  numAffectedRows?: number;
}>;

export type CopyPeer = { exec: LocalRawExec };

export type LocalClient = {
  db: LocalDb;
  exec: LocalRawExec;
  transaction: <T>(cb: () => Promise<T>) => Promise<T>;
  destroy: () => Promise<void>;
  deleteDatabaseFile: () => Promise<void>;
  getDatabaseFile: () => Promise<File>;
  getDatabaseInfo: () => Promise<{
    databasePath?: string;
    databaseSizeBytes?: number;
    storageType?: string;
    persisted?: boolean;
  }>;
  overwriteDatabaseFile: (file: File | Blob | ArrayBuffer) => Promise<void>;
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

export type LocalAnyRow = Record<string, unknown> & { id: string };
export type LocalChildRow = Record<string, unknown>;
export type LocalRowInput = Record<string, unknown>;

export type LoadedConvContext = {
  settings: ConversationSettingsProjection;
  boundCharacters: {
    binding: {
      characterId: string;
      orderIndex: number | null;
      isActive: boolean | null;
      overrides: unknown;
    };
    character: CharacterRow;
  }[];
  persona: PersonaRow | undefined;
  preset: PresetRow | undefined;
  lbRows: LorebookRow[];
  lbEntries: LorebookEntryRow[];
} | null;

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

export class ParamError extends Error {
  public readonly params: Record<string, string | number>;
  constructor(key: TranslationKey, params: Record<string, string | number>) {
    super(key);
    this.name = "ParamError";
    this.params = params;
  }
}

export type DocSlug = keyof typeof pathnames extends infer K
  ? K extends `/${infer R extends `docs/${string}`}`
    ? R extends `${string}[${string}`
      ? never
      : R
    : never
  : never;

type PostLeaf = "TITLE" | "DESCRIPTION" | "AUTHOR";

type PostI18nKey = {
  [K in TranslationKey]: K extends `${infer P}.${PostLeaf}`
    ? `${P}.TITLE` extends TranslationKey
      ? `${P}.DESCRIPTION` extends TranslationKey
        ? `${P}.AUTHOR` extends TranslationKey
          ? P
          : never
        : never
      : never
    : never;
}[TranslationKey];

export type BlogCategory = "launch" | "engineering" | "product" | "update";

type BlogHeading = {
  id: string;
  i18nLeaf: string;
  level: 2 | 3;
};

export type BlogPost<Slug extends string = string> = {
  slug: Slug;
  date: string;
  tags: string[];
  Component: ComponentType;
  i18nKey: PostI18nKey;
  category: BlogCategory;
  wordCount: number;
  headings: readonly BlogHeading[];
  heroImage?: string;
};

export type BlogListPost = {
  slug: string;
  date: string;
  tags: readonly string[];
  category: BlogCategory;
  wordCount: number;
  heroImage?: string;
  title: string;
  description: string;
};

type ChangeFrequency = NonNullable<
  MetadataRoute.Sitemap[number]["changeFrequency"]
>;

export type PriorityEntry = {
  priority: number;
  changeFrequency: ChangeFrequency;
};

export type SectionPriorities = Partial<
  Record<Pathname extends string ? Pathname : never, PriorityEntry>
>;

type DocI18nPrefix = {
  [K in TranslationKey]: K extends `${infer P}.TITLE`
    ? `${P}.SUBTITLE` extends TranslationKey
      ? P
      : never
    : never;
}[TranslationKey];

export type DocEntry = {
  slug: string;
  path: Pathname;
  i18nPrefix: DocI18nPrefix;
  date: string;
  updated?: string;
  priority: number;
  changeFrequency: ChangeFrequency;
};

export type BlogEntry = {
  slug: string;
  date: string;
  updated?: string;
  tags: readonly string[];
  i18nKey: PostI18nKey;
  priority: number;
  changeFrequency: ChangeFrequency;
  category: BlogCategory;
  wordCount: number;
  headings: readonly BlogHeading[];
  heroImage?: string;
};

export type ExportRow = Record<string, unknown> & { id: string };

export type NativeImport = {
  version?: string;
  conversation: { id?: string; title?: string | null };
  settings: Record<string, unknown> | null;
  messages: ExportRow[];
  items: ExportRow[];
  characters: ExportRow[];
  persona: ExportRow | null;
  preset: ExportRow | null;
  lorebooks: ExportRow[];
  lorebookEntries: ExportRow[];
  bindings: {
    characters: Array<Record<string, unknown>>;
    lorebooks: Array<Record<string, unknown>>;
  };
};

export type OrpgExtension = {
  lorebooks?: ExportRow[];
  lorebookEntries?: ExportRow[];
};

export type OrpgImport = {
  version?: string;
  title?: string;
  characters?: Record<string, Record<string, unknown>>;
  messages?: Record<string, Record<string, unknown>>;
  items?: Record<string, { id?: string; data?: unknown }>;
  [extensionKey: string]: unknown;
};

export type StMetadata = {
  user_name: string;
  character_name: string;
  create_date: string;
  chat_metadata?: Record<string, unknown>;
};

export type StMessage = {
  name: string;
  is_user: boolean;
  is_system?: boolean;
  send_date: string;
  mes: string;
  extra?: {
    reasoning?: string;
    token_count?: number;
    model?: string;
    [k: string]: unknown;
  };
  swipe_id?: number;
  swipes?: string[];
};
