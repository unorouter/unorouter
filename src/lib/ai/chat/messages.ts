import type { PersistMessageItem } from "@/lib/validation/chat";

export type MessageItemData = PersistMessageItem;

export type PersistMessage = {
  id?: string;
  parentId?: string | null;
  characterId?: string | null;
  role: "system" | "user" | "assistant" | "tool";
  model?: string;
  items: MessageItemData[];
};

export type MessagePart = { type: string; [key: string]: unknown };

export type ApiMessage = {
  id: string;
  parentId?: string | null;
  characterId?: string | null;
  role: string;
  model?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  cost?: number | null;
  branchIndex?: number;
  isActiveBranch?: boolean;
  isEdited?: boolean;
  items: Array<{
    id: string;
    sequenceIndex: number;
    outputIndex?: number | null;
    type: string;
    data: unknown;
  }>;
  [key: string]: unknown;
};

// Joins messages + items by messageId; UI thread + export reader.
export function joinItemsToMessages<
  M extends { id: string },
  I extends { messageId: string },
>(msgs: M[], items: I[]): Array<M & { items: I[] }> {
  const byMsg = new Map<string, I[]>();
  for (const it of items) {
    const arr = byMsg.get(it.messageId) ?? [];
    arr.push(it);
    byMsg.set(it.messageId, arr);
  }
  return msgs.map((m) => ({ ...m, items: byMsg.get(m.id) ?? [] }));
}

export function partsToItems(parts: MessagePart[]): MessageItemData[] {
  const out: MessageItemData[] = [];
  for (const part of parts) {
    if (part.type === "text" && typeof part.text === "string") {
      out.push({ type: "text", data: { text: part.text } });
    } else if (part.type === "reasoning" && typeof part.text === "string") {
      out.push({ type: "reasoning", data: { text: part.text } });
    } else if (part.type === "tool-invocation") {
      const toolCallId = String(part.toolInvocationId ?? part.toolCallId ?? "");
      // tool-invocation round-trips call/result by state; stored as typed rows.
      if (part.state === "result" || part.result !== undefined) {
        out.push({
          type: "tool_result",
          data: {
            tool_call_id: toolCallId,
            result: part.result,
          },
        });
      } else {
        out.push({
          type: "tool_call",
          data: {
            tool_name: String(part.toolName ?? ""),
            tool_call_id: toolCallId,
            args: part.args ?? part.toolInput ?? {},
          },
        });
      }
    } else if (part.type === "file" || part.type === "source-url") {
      out.push({
        type: part.type === "file" ? "file" : "image",
        data: {
          url: String(part.url ?? ""),
          mime_type: String(
            part.mediaType ?? part.mimeType ?? "application/octet-stream",
          ),
          ...(typeof part.filename === "string" && { name: part.filename }),
        },
      });
    } else if (
      part.type === "data-task" ||
      (part.type === "data" && part.name === "task")
    ) {
      const data = (part.data ?? part) as Record<string, unknown>;
      out.push({
        type: "task",
        data: {
          task_id: String(data.taskId ?? data.task_id ?? ""),
          model: String(data.model ?? ""),
          status: String(data.status ?? "pending"),
          ...(typeof data.progress === "string" && { progress: data.progress }),
        },
      });
    }
    // Unknown part types (AI SDK "step-start", future shapes) are dropped.
  }
  return out;
}

export function itemsToParts(items: ApiMessage["items"]): MessagePart[] {
  const parts: MessagePart[] = [];
  for (const it of items) {
    const data = (it.data ?? {}) as Record<string, unknown>;
    switch (it.type) {
      case "text":
        parts.push({ type: "text", text: String(data.text ?? "") });
        break;
      case "reasoning":
        parts.push({ type: "reasoning", text: String(data.text ?? "") });
        break;
      case "tool_call":
        parts.push({
          type: "tool-invocation",
          toolInvocationId: String(data.tool_call_id ?? ""),
          toolName: String(data.tool_name ?? ""),
          args: data.args ?? {},
        });
        break;
      case "tool_result":
        parts.push({
          type: "tool-invocation",
          toolInvocationId: String(data.tool_call_id ?? ""),
          result: data.result,
          state: "result",
        });
        break;
      case "file":
      case "image":
        parts.push({
          type: "file",
          url: String(data.url ?? ""),
          mediaType: String(data.mime_type ?? "application/octet-stream"),
          ...(typeof data.name === "string" && { filename: data.name }),
        });
        break;
      case "task":
        // Runtime rewrites to `{ type: "data", name: "task", data: {...} }`.
        parts.push({
          type: "data-task",
          data: {
            taskId: String(data.task_id ?? ""),
            model: String(data.model ?? ""),
            status: String(data.status ?? "pending"),
            ...(typeof data.progress === "string" && {
              progress: data.progress,
            }),
          },
        });
        break;
    }
  }
  return parts;
}
