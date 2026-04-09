/** A serializable message part for persistence (matches persistMessagesBody schema). */
export type MessagePart = { type: string; [key: string]: unknown };

/** A message payload sent to the persist endpoint. */
export type PersistMessage = {
  role: "system" | "user" | "assistant" | "tool";
  model?: string;
  parts: MessagePart[];
};

/** Shape of a message returned by the paginated messages API. */
export type ApiMessage = {
  id?: string;
  model?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  cost?: number | null;
  [key: string]: unknown;
};
