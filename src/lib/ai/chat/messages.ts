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

export function walkActiveBranch<
  M extends {
    id: string;
    parentId: string | null;
    isActiveBranch?: boolean | null;
  },
>(messages: M[]): { path: M[]; tipId: string | undefined } {
  // Walk DOWN from the root, choosing exactly one active child per level, and stay
  // deterministic under the two corruptions this data has actually hit.
  //
  // A parentId naming a row that does not exist severs the chain: the walk stops at the
  // greeting and every turn past the orphan is unreachable, so the request ships one
  // message out of a full conversation. The load path repairs these rows, but the send
  // path reads straight from the DB. Treat an unresolvable parent as the row's own
  // predecessor by array order.
  const ids = new Set(messages.map((m) => m.id));
  const childrenOf = new Map<string | null, M[]>();
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const orphaned = m.parentId != null && !ids.has(m.parentId);
    const key = orphaned ? (messages[i - 1]?.id ?? null) : (m.parentId ?? null);
    const arr = childrenOf.get(key) ?? [];
    arr.push(m);
    childrenOf.set(key, arr);
  }
  // Every sibling deactivated is corruption, not a choice (a branch switch given an
  // unknown id once deactivated a whole root row of greetings). "Newest" is the wrong
  // tiebreak there: it picks a childless sibling and the walk stops dead, so the
  // request carries one greeting and none of the conversation. The sibling that was
  // actually continued is the one with children; prefer it, newest only among equals.
  const pickChild = (kids: M[] | undefined): M | undefined => {
    if (!kids || kids.length === 0) return undefined;
    const active = kids.filter((k) => k.isActiveBranch !== false);
    if (active.length > 0) return active[active.length - 1];
    const continued = kids.filter(
      (k) => (childrenOf.get(k.id)?.length ?? 0) > 0,
    );
    const pool = continued.length > 0 ? continued : kids;
    return pool[pool.length - 1];
  };
  const path: M[] = [];
  let cur = pickChild(childrenOf.get(null));
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    path.push(cur);
    cur = pickChild(childrenOf.get(cur.id));
  }
  return { path, tipId: path.at(-1)?.id };
}

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

// One reasoning box per reply. `extractReasoningMiddleware` emits a part for
// EVERY <think> pair, and models that think between paragraphs produce a handful
// per turn, which rendered as a stack of collapsed boxes interleaved with the
// prose ("it gave me 5 responses"). Every comparable client that merges keeps
// reasoning as a single field and joins the segments, so collapse them here, at
// the one boundary both the persist and the reload path cross.
const REASONING_JOIN = "\n\n";

export function mergeReasoningParts(parts: MessagePart[]): MessagePart[] {
  const reasoningCount = parts.filter((p) => p.type === "reasoning").length;
  if (reasoningCount < 2) return parts;
  const texts = parts
    .filter((p) => p.type === "reasoning" && typeof p.text === "string")
    .map((p) => (p.text as string).trim())
    .filter((s) => s.length > 0);
  const merged = texts.join(REASONING_JOIN);
  const out: MessagePart[] = [];
  let placed = false;
  for (const part of parts) {
    if (part.type !== "reasoning") {
      out.push(part);
      continue;
    }
    // Keep the FIRST slot: reasoning that precedes its prose reads as a preamble,
    // whereas hoisting it below the text it explains reverses the order.
    if (placed) continue;
    out.push({ ...part, text: merged });
    placed = true;
  }
  return out;
}

export function partsToItems(parts: MessagePart[]): MessageItemData[] {
  const out: MessageItemData[] = [];
  for (const part of mergeReasoningParts(parts)) {
    if (part.type === "text" && typeof part.text === "string") {
      out.push({ type: "text", data: { text: part.text } });
    } else if (part.type === "reasoning" && typeof part.text === "string") {
      out.push({ type: "reasoning", data: { text: part.text } });
    } else if (part.type === "tool-invocation") {
      const toolCallId = String(part.toolInvocationId ?? part.toolCallId ?? "");
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
    } else if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
      // ai-sdk v6+ typed tool parts (tool-<name> / dynamic-tool). Without this
      // branch they fell through and tool blocks vanished on reload.
      const toolCallId = String(part.toolCallId ?? "");
      const toolName =
        part.type === "dynamic-tool"
          ? String(part.toolName ?? "")
          : part.type.slice("tool-".length);
      if (part.state === "output-available" || part.state === "output-error") {
        out.push({
          type: "tool_result",
          data: {
            tool_call_id: toolCallId,
            result:
              part.state === "output-error"
                ? { error: String(part.errorText ?? "") }
                : part.output,
          },
        });
      } else {
        out.push({
          type: "tool_call",
          data: {
            tool_name: toolName,
            tool_call_id: toolCallId,
            args: part.input ?? {},
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
          ...(typeof data.kind === "string" && { kind: data.kind }),
        },
      });
    } else if (
      part.type === "data-error" ||
      (part.type === "data" && part.name === "error")
    ) {
      const data = (part.data ?? part) as Record<string, unknown>;
      out.push({
        type: "error",
        data: {
          message: String(data.message ?? ""),
          ...(typeof data.model === "string" && { model: data.model }),
        },
      });
    }
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
      case "error":
        parts.push({
          type: "data-error",
          data: {
            message: String(data.message ?? ""),
            ...(typeof data.model === "string" && { model: data.model }),
          },
        });
        break;
      case "task":
        parts.push({
          type: "data-task",
          data: {
            taskId: String(data.task_id ?? ""),
            model: String(data.model ?? ""),
            status: String(data.status ?? "pending"),
            ...(typeof data.progress === "string" && {
              progress: data.progress,
            }),
            ...(typeof data.kind === "string" && { kind: data.kind }),
          },
        });
        break;
    }
  }
  return parts;
}
