/** Discriminated message item, matching the message_items.type column. */
export type MessageItemData =
  | { type: "text"; data: { text: string }; output_index?: number; id?: string }
  | {
      type: "reasoning";
      data: { text: string; status?: string };
      output_index?: number;
      id?: string;
    }
  | {
      type: "tool_call";
      data: { tool_name: string; tool_call_id: string; args: unknown; [k: string]: unknown };
      output_index?: number;
      id?: string;
    }
  | {
      type: "tool_result";
      data: { tool_call_id: string; result: unknown; [k: string]: unknown };
      output_index?: number;
      id?: string;
    }
  | {
      type: "file" | "image";
      data: {
        url: string;
        mime_type: string;
        name?: string;
        r2_key?: string;
        [k: string]: unknown;
      };
      output_index?: number;
      id?: string;
    }
  | {
      type: "task";
      data: {
        task_id: string;
        model: string;
        status: string;
        progress?: string;
        [k: string]: unknown;
      };
      output_index?: number;
      id?: string;
    };

/** A message payload sent to the persist endpoint. */
export type PersistMessage = {
  id?: string;
  parentId?: string | null;
  characterId?: string | null;
  role: "system" | "user" | "assistant" | "tool";
  model?: string;
  items: MessageItemData[];
};

/** Loose part shape used by the AI SDK / assistant-ui side. */
export type MessagePart = { type: string; [key: string]: unknown };

/** Shape of a message returned by the paginated messages API. */
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

// ---------------------------------------------------------------------------
// Translators between AI SDK / assistant-ui parts <-> our message_items
// ---------------------------------------------------------------------------

export function partsToItems(parts: MessagePart[]): MessageItemData[] {
  const out: MessageItemData[] = [];
  for (const part of parts) {
    if (part.type === "text" && typeof part.text === "string") {
      out.push({ type: "text", data: { text: part.text } });
    } else if (part.type === "reasoning" && typeof part.text === "string") {
      out.push({ type: "reasoning", data: { text: part.text } });
    } else if (part.type === "tool-invocation") {
      const toolCallId = String(part.toolInvocationId ?? part.toolCallId ?? "");
      // assistant-ui round-trips both call and result through the same part
      // type, distinguished by `state`. Keep them separate here so the DB
      // stores typed rows and a later edit can re-emit with the result intact.
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
          mime_type: String(part.mediaType ?? part.mimeType ?? "application/octet-stream"),
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
    // Unknown part types (e.g. AI SDK stream markers like "step-start", or
    // future part shapes we don't model) are intentionally dropped. Storing
    // them would leak raw JSON into the rendered message body.
  }
  return out;
}

export function itemsToParts(
  items: ApiMessage["items"],
): MessagePart[] {
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
        // Emit AI SDK data-part shape; the runtime rewrites this to
        // `{ type: "data", name: "task", data: {...} }` for the client.
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
      // Unknown stored types are skipped rather than rendered as raw JSON.
    }
  }
  return parts;
}
