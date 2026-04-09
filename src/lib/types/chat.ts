/** A serializable message part for persistence (matches persistMessagesBody schema). */
export type MessagePart = { type: string; [key: string]: unknown };

/** A message payload sent to the persist endpoint. */
export type PersistMessage = {
  role: "system" | "user" | "assistant" | "tool";
  model?: string;
  parts: MessagePart[];
};
