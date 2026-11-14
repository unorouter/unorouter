import type { ChatUIMessage } from "@/lib/types";
import { rec } from "@/lib/utils/base";
import type { PersistMessageItem } from "@/lib/validation/chat";

export type MessagePart = ChatUIMessage["parts"][number];

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
  createdAt?: string | number | Date | null;
  items: Array<{
    id: string;
    sequenceIndex: number;
    outputIndex?: number | null;
    type: string;
    data: Record<string, unknown> | null;
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
  // A parentId naming a missing row severs the chain and the request ships one
  // message out of a full conversation, so an unresolvable parent falls back to
  // the row's predecessor by array order.
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
  // Every sibling deactivated is corruption, not a choice, and "newest" is the
  // wrong tiebreak there: it picks a childless sibling and the walk stops dead.
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

const REASONING_JOIN = "\n\n";

function mergeReasoningParts(parts: MessagePart[]): MessagePart[] {
  const texts = parts.flatMap((p) => (p.type === "reasoning" ? [p.text] : []));
  if (texts.length < 2) return parts;
  const merged = texts
    .map((t) => t.trim())
    .filter(Boolean)
    .join(REASONING_JOIN);
  let placed = false;
  return parts.flatMap((p): MessagePart[] => {
    if (p.type !== "reasoning") return [p];
    if (placed) return [];
    placed = true;
    return [{ ...p, text: merged }];
  });
}

export function errorData(d: Record<string, unknown>) {
  return {
    message: String(d.message ?? ""),
    ...(typeof d.model === "string" && { model: d.model }),
    ...(typeof d.code === "string" && { code: d.code }),
    ...(typeof d.param === "string" && { param: d.param }),
    ...(typeof d.status === "number" && { status: d.status }),
    ...(typeof d.requestId === "string" && { requestId: d.requestId }),
  };
}

// Tool parts are neither stored nor read back: chat sends no tools, and a
// stored tool item converts to a nameless, id-less tool call upstream.
export function partsToItems(parts: MessagePart[]): PersistMessageItem[] {
  const out: PersistMessageItem[] = [];
  for (const part of mergeReasoningParts(parts)) {
    if (part.type === "text") {
      out.push({ type: "text", data: { text: part.text } });
    } else if (part.type === "reasoning") {
      out.push({ type: "reasoning", data: { text: part.text } });
    } else if (part.type === "file") {
      out.push({
        type: "file",
        data: {
          url: part.url,
          mime_type: part.mediaType,
          ...(part.filename && { name: part.filename }),
        },
      });
    } else if (part.type === "source-url") {
      out.push({
        type: "image",
        data: { url: part.url, mime_type: "application/octet-stream" },
      });
    } else if (part.type === "data-task") {
      const d = rec(part.data) ?? {};
      out.push({
        type: "task",
        data: {
          task_id: String(d.taskId ?? ""),
          model: String(d.model ?? ""),
          status: String(d.status ?? "pending"),
          ...(typeof d.progress === "string" && { progress: d.progress }),
          ...(typeof d.kind === "string" && { kind: d.kind }),
        },
      });
    } else if (part.type === "data-error") {
      out.push({ type: "error", data: errorData(rec(part.data) ?? {}) });
    }
  }
  return out;
}

export function itemsToParts(items: ApiMessage["items"]): MessagePart[] {
  const parts: MessagePart[] = [];
  for (const it of items) {
    const data = it.data ?? {};
    switch (it.type) {
      case "text":
      case "reasoning":
        parts.push({ type: it.type, text: String(data.text ?? "") });
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
        parts.push({ type: "data-error", data: errorData(data) });
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
  // Rows written before the merge existed still hold one row per <think> block.
  return mergeReasoningParts(parts);
}
