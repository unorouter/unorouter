import type { UIMessage } from "ai";
import type { useTranslations } from "next-intl";

export type TranslationKey = Parameters<
  ReturnType<typeof useTranslations<never>>
>[0];

export type DashToUnderscore<S extends string> = S extends `${infer A}-${infer B}`
  ? `${A}_${B}`
  : S;

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

// Mirror of the `messageMetadata` shape emitted by stream.service finish frame.
export type ChatMessageMetadata = {
  usage?: MessageUsage;
  droppedParams?: string;
};

export type ChatUIMessage = UIMessage<ChatMessageMetadata>;

export type EditorState = { mode: "list" } | { mode: "edit"; id?: string };

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
