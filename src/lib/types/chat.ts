/** A serializable message part for persistence (matches persistMessagesBody schema). */
export type MessagePart = { type: string; [key: string]: unknown };

/** A message payload sent to the persist endpoint. */
export type PersistMessage = {
  id: string;
  role: string;
  model?: string;
  parts: unknown;
};

/** A pending user message stashed before the conversation is created. */
export type PendingUserMessage = {
  id: string;
  parts: MessagePart[];
};

/** Context passed to the attachment adapter for R2 uploads. */
export type AttachmentUploadContext = {
  convId: string | null;
  msgId: string;
};

/** Tracks which thread's pages have been loaded into useChat. */
export type LoadedPagesState = {
  threadId: string;
  count: number;
};

/** Mutable context for closures that outlive the render in ChatRuntimeHook. */
export type ChatRuntimeContext = {
  remoteId: string | undefined;
  model: string | null;
  msgId: string;
  pendingUserMessage: PendingUserMessage | null;
};
