import type { PersistMessageItem } from "@/lib/validation/chat";
import type { ApiMessage, MessagePart } from "@/lib/ai/chat/messages";
import { isCustomModelId } from "@/lib/ai/chat/custom-provider-id";
import {
  errorData,
  itemsToParts,
  partsToItems,
  walkActiveBranch,
} from "@/lib/ai/chat/messages";
import { upsertLocalMedia } from "@/lib/db/client/data/media/media";
import { invalidateInlay } from "@/lib/db/client/data/media/inlay-render";
import {
  readConvRegexScripts,
  readConvTriggers,
  readLocalConversation,
  readLocalConversationSettings,
  readLocalMessages,
  bumpLocalConversationTotals,
  updateLocalConversationSettings,
  upsertLocalConversation,
  updateLocalMessage,
  upsertLocalMessage,
  upsertLocalMessageItem,
  readJoinedMessages,
  replaceLocalMessageItems,
} from "@/lib/db/client/data/chat/chat";
import { runRegexScripts } from "@/lib/ai/chat/regex-scripts";
import type { IllustratorConvSettings } from "@/components/pages/sidebar/chat/illustrator/run";
import { requestImagePromptReview } from "@/components/pages/sidebar/chat/illustrator/prompt-dialog-store";
import { makeTriggerContext, runTriggers } from "@/lib/ai/chat/triggers/vm";
import { makeClientTriggerOps } from "@/components/pages/sidebar/chat/runtime/transport/trigger-ops-client";
import { hasJsHandlers, runJsEditTrigger } from "@/lib/ai/chat/plugins/engine";
import { autoplayReply } from "@/components/pages/sidebar/chat/rp/voice/voice-run";
import { insertLocalRequestLog } from "@/lib/db/client/data/chat/request-log";
import {
  drainSoon,
  enqueueLogEnrich,
} from "@/lib/db/client/outbox/pending/queue";
import type { RequestLogRow } from "@/lib/db/schema/rows";
import { invalidateAndBroadcast } from "@/lib/react-query/cross-tab-invalidate";
import { queryKeys } from "@/lib/react-query/keys";
import type { ChatMessageMetadata } from "@/lib/types";
import { parseStringMap, uid } from "@/lib/utils/base";
import { dayjs } from "@/lib/utils/format/date";
import {
  chatModelAtom,
  chatRunningAtom,
  chatStore,
  convIdAtom,
  getThreadRuntime,
  globalVarsAtom,
  historyLoadedAtom,
  lastStreamErrorAtom,
  reloadLiveThreadFromDb,
  replaceMessageParts,
  speakingCharacterIdAtom,
} from "@/store/chat-store";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { handleError } from "@/lib/utils/client";
import {
  getExternalStoreMessages,
  type MessageFormatAdapter,
  type MessageFormatItem,
  type MessageFormatRepository,
  type ThreadHistoryAdapter,
  type ThreadMessage,
} from "@assistant-ui/core";
import type { QueryClient } from "@tanstack/react-query";

type EncodedContent = {
  role: "system" | "user" | "assistant";
  parts: MessagePart[];
};

function toEncoded(v: Record<string, unknown>): EncodedContent {
  if (
    (v.role !== "system" && v.role !== "user" && v.role !== "assistant") ||
    !Array.isArray(v.parts)
  )
    throw new Error("unexpected history format");
  return { role: v.role, parts: v.parts };
}

type IllustratorJob = {
  taskId: string;
  settings: IllustratorConvSettings;
  utilityModel: string;
};

async function repairBrokenChain(
  convId: string,
  msgs: ApiMessage[],
): Promise<ApiMessage[]> {
  if (msgs.length < 2) return msgs;
  const ids = new Set(msgs.map((m) => m.id));
  const ts = (m: ApiMessage) => dayjs(m.createdAt ?? 0).valueOf();
  const sorted = [...msgs].sort((a, b) => ts(a) - ts(b));
  const firstUser = sorted.find((m) => m.role === "user");
  const repaired: ApiMessage[] = [];
  const out = msgs.map((m) => {
    const dangling = m.parentId != null && !ids.has(m.parentId);
    const isGreeting =
      m.parentId == null &&
      m.role === "assistant" &&
      (firstUser == null || ts(m) <= ts(firstUser));
    const firstRoot = sorted[0]?.id === m.id;
    const midConversation = sorted.some(
      (p) => p.role === "assistant" && ts(p) < ts(m),
    );
    const phantomRoot =
      m.parentId == null && !isGreeting && !firstRoot && midConversation;
    if (!dangling && !phantomRoot) return m;
    const prev = [...sorted]
      .reverse()
      .find((p) => p.id !== m.id && ts(p) < ts(m));
    if (!prev) return m;
    const fixed = { ...m, parentId: prev.id };
    repaired.push(fixed);
    return fixed;
  });
  if (repaired.length > 0) {
    logChatDebug("history.chain_repair", {
      convId,
      repaired: repaired.map((m) => m.id),
    });
    // Opportunistic: the repaired chain is already in `out`, so a write that
    // cannot land must not take the history render down with it.
    try {
      for (const m of repaired)
        await updateLocalMessage(m.id, { parentId: m.parentId });
    } catch {}
  }
  return out;
}

function withLiveTurn<TMessage>(
  convId: string,
  stored: ApiMessage[],
  threadMessages: readonly ThreadMessage[],
  encode: (message: TMessage) => EncodedContent,
): ApiMessage[] {
  const known = new Set(stored.map((m) => m.id));
  const out = [...stored];
  let parentId =
    [...stored].reverse().find((m) => m.isActiveBranch !== false)?.id ?? null;
  const now = dayjs().toDate();
  for (const tm of threadMessages) {
    // The streaming reply stays out: the sdk re-pushes it on the next chunk,
    // and a copy here would mark it persisted before it ever settles.
    const settled =
      tm.status === undefined ||
      tm.status.type === "complete" ||
      tm.status.type === "incomplete";
    if (!settled) continue;
    for (const inner of getExternalStoreMessages<TMessage>(tm)) {
      const content = encode(inner);
      const id = formatIdOf(inner);
      if (!id) continue;
      if (!known.has(id)) {
        out.push({
          id,
          convId,
          parentId,
          role: content.role,
          isActiveBranch: true,
          createdAt: now,
          items: partsToItems(content.parts).map((it, seq) => ({
            id: uid(),
            sequenceIndex: seq,
            outputIndex: null,
            type: it.type,
            data: it.data,
          })),
        });
        known.add(id);
      }
      parentId = id;
    }
  }
  return out;
}

function formatIdOf(message: unknown): string | null {
  return typeof message === "object" &&
    message !== null &&
    "id" in message &&
    typeof message.id === "string"
    ? message.id
    : null;
}

function buildRepository<TMessage>(
  raw: ApiMessage[],
  formatAdapter: MessageFormatAdapter<TMessage, Record<string, unknown>>,
): MessageFormatRepository<TMessage> {
  const messages = raw.map<MessageFormatItem<TMessage>>((m) => {
    const parts = itemsToParts(m.items ?? []);
    const decoded = formatAdapter.decode({
      id: m.id,
      parent_id: m.parentId ?? null,
      format: formatAdapter.format,
      content: { role: m.role, parts },
    });
    return decoded;
  });

  const activeTip = [...raw].reverse().find((m) => m.isActiveBranch !== false);
  const headId =
    activeTip?.id ?? (raw.length > 0 ? raw[raw.length - 1].id : null);
  return { headId, messages };
}

function assistantTextOf(content: EncodedContent): string {
  if (content.role !== "assistant") return "";
  return content.parts
    .flatMap((p) => (p.type === "text" ? [p.text] : []))
    .join("\n");
}

function mapText(
  parts: MessagePart[],
  fn: (text: string) => string | Promise<string>,
): Promise<MessagePart[]> {
  return Promise.all(
    parts.map(async (p) =>
      p.type === "text" ? { ...p, text: await fn(p.text) } : p,
    ),
  );
}

async function applyAssistantOutputTransforms(
  convId: string,
  parts: MessagePart[],
): Promise<MessagePart[]> {
  let out = parts;
  const scripts = await readConvRegexScripts(convId);
  if (scripts.length > 0) {
    out = await mapText(out, (text) =>
      runRegexScripts(text, scripts, "editoutput"),
    );
  }
  const editCtx = makeTriggerContext({
    mode: "output",
    vars: {},
    globalVars: {},
    chat: [],
  });
  const triggers = await readConvTriggers(convId);
  if (triggers.length > 0) {
    const { extractLuaCodes, runLuaEditTrigger } =
      await import("@/lib/ai/chat/triggers/lua/engine");
    const luaCodes = extractLuaCodes(triggers);
    if (luaCodes.length > 0) {
      out = await mapText(out, (text) =>
        runLuaEditTrigger(luaCodes, "editoutput", editCtx, text),
      );
    }
  }
  if (hasJsHandlers("output")) {
    out = await mapText(out, (text) =>
      runJsEditTrigger("output", editCtx, text),
    );
  }
  return out;
}

function appendStreamErrorItem(
  items: PersistMessageItem[],
  resolvedModel: string | null,
): void {
  const streamError = chatStore.get(lastStreamErrorAtom);
  if (!streamError || Date.now() - streamError.at >= 30_000) return;
  chatStore.set(lastStreamErrorAtom, null);
  if (items.some((it) => it.type === "error")) return;
  items.push({
    type: "error",
    data: errorData({ ...streamError, model: resolvedModel ?? undefined }),
  });
}

async function prepareIllustratorJob(
  convId: string,
  items: PersistMessageItem[],
  resolvedModel: string | null,
): Promise<IllustratorJob | null> {
  const { resolveIllustratorSettings } =
    await import("@/components/pages/sidebar/chat/illustrator/run");
  const illu = await resolveIllustratorSettings(convId);
  const hasError = items.some((it) => it.type === "error");
  if (!illu?.imageEnabled || hasError) return null;
  const taskId = uid();
  const job: IllustratorJob = {
    taskId,
    settings: illu,
    utilityModel: illu.utilityModel || resolvedModel || illu.defaultModel || "",
  };
  items.push({
    type: "task",
    data: {
      task_id: taskId,
      kind: "image",
      model: job.utilityModel,
      status: "generating",
    },
  });
  return job;
}

async function persistInlayMedia(
  convId: string,
  metadata: ChatMessageMetadata | null,
): Promise<void> {
  if (!metadata?.inlayMedia) return;
  for (const m of metadata.inlayMedia) {
    await upsertLocalMedia({
      id: m.id,
      convId,
      mimeType: m.mimeType,
      sizeBytes: m.sizeBytes,
      dataBase64: m.dataBase64,
      r2Key: null,
      r2Url: null,
      width: m.width,
      height: m.height,
    });
    // The token resolver cached a resolved-empty marker while streaming; without
    // dropping it the image stays blank until reload.
    invalidateInlay(m.id);
  }
}

type MessageRows = NonNullable<Awaited<ReturnType<typeof readLocalMessages>>>;

type BranchPlacement = {
  parentId: string | null;
  parentBranchVars: string | null;
  nextBranchIndex: number;
};

// A message is only ever added to the branch on screen, so its ancestors ARE
// the active branch. A swipe whose switch never reached the database left an
// older reply inactive under a live continuation, and the next reload from the
// database jumped back to the stale swipe.
async function activateAncestors(
  convId: string,
  rows: MessageRows,
  parentId: string | null,
  now: Date,
): Promise<void> {
  const byId = new Map(rows.map((m) => [m.id, m]));
  const fixed: string[] = [];
  const seen = new Set<string>();
  for (
    let cur = parentId ? byId.get(parentId) : undefined;
    cur && !seen.has(cur.id);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined
  ) {
    seen.add(cur.id);
    if (cur.isActiveBranch !== false) continue;
    fixed.push(cur.id);
    const parent = cur.parentId ?? null;
    for (const sib of rows) {
      if ((sib.parentId ?? null) !== parent) continue;
      const active = sib.id === cur.id;
      if ((sib.isActiveBranch !== false) === active) continue;
      await updateLocalMessage(sib.id, {
        isActiveBranch: active,
        updatedAt: now,
      });
    }
  }
  if (fixed.length > 0)
    logChatDebug("branch.reactivated", { convId, messages: fixed });
}

// Existing siblings MUST be deactivated and the new one take the next
// branchIndex, else walkActiveBranch picks the wrong tip and a branch switch
// renders an empty thread.
async function placeOnBranch(
  convId: string,
  messageId: string,
  requestedParentId: string | null,
  now: Date,
  role: string,
): Promise<BranchPlacement> {
  let parentId = requestedParentId;
  let parentBranchVars: string | null = null;
  let siblings: MessageRows = [];
  const existing = (await readLocalMessages(convId)) ?? [];
  if (existing.length > 0) {
    const tipRow = walkActiveBranch(existing).path.at(-1);
    if (parentId === null && tipRow) parentId = tipRow.id;
    // A requested parent that isn't persisted would FK-fail the insert.
    if (parentId && !existing.some((m) => m.id === parentId)) {
      parentId = tipRow?.id ?? null;
    }
    // A history load during a new chat's first send can drop the user's
    // message from the runtime, which then parents the reply on the greeting
    // and hides the message on a dead branch. The fresh childless user turn
    // under that same parent is the one this reply answers.
    if (role === "assistant" && parentId) {
      const newest = existing.reduce<(typeof existing)[number] | undefined>(
        (a, m) =>
          !a || dayjs(m.createdAt).valueOf() > dayjs(a.createdAt).valueOf()
            ? m
            : a,
        undefined,
      );
      if (
        newest &&
        newest.role === "user" &&
        newest.parentId === parentId &&
        now.getTime() - dayjs(newest.createdAt).valueOf() < 120_000 &&
        !existing.some((m) => m.parentId === newest.id)
      ) {
        logChatDebug("history.reparent", {
          convId,
          messageId,
          from: parentId,
          to: newest.id,
        });
        parentId = newest.id;
      }
    }
    const parentRow = parentId
      ? existing.find((m) => m.id === parentId)
      : tipRow;
    parentBranchVars = parentRow?.branchVars ?? null;
    siblings = existing.filter(
      (m) => (m.parentId ?? null) === parentId && m.id !== messageId,
    );
  }
  const nextBranchIndex =
    siblings.length === 0
      ? 0
      : Math.max(
          ...siblings.map((s) => s.branchIndex ?? 0),
          siblings.length - 1,
        ) + 1;
  for (const sib of siblings) {
    await updateLocalMessage(sib.id, { isActiveBranch: false, updatedAt: now });
  }
  await activateAncestors(convId, existing, parentId, now);
  return { parentId, parentBranchVars, nextBranchIndex };
}

async function persistRequestLog(
  queryClient: QueryClient,
  convId: string,
  messageId: string,
  metadata: ChatMessageMetadata | null,
  resolvedModel: string | null,
  now: Date,
): Promise<void> {
  const usage = metadata?.usage ?? null;
  const debug = metadata?.debug ?? null;
  if (!debug) return;
  const logRow: RequestLogRow = {
    ...debug,
    msgId: messageId,
    convId,
    inputTokens: usage?.inputTokens ?? null,
    outputTokens: usage?.outputTokens ?? null,
    cachedInputTokens: usage?.cachedInputTokens ?? null,
    cost: usage?.cost ?? null,
    durationMs: usage?.durationMs ?? null,
    tokensPerSecond: usage?.tokensPerSecond ?? null,
    createdAt: now,
  };
  await insertLocalRequestLog(logRow);
  invalidateAndBroadcast(queryClient, [
    queryKeys.requestLog(messageId),
    queryKeys.requestLogList(convId),
  ]);
  const reqId = logRow.requestId;
  if (reqId && !isCustomModelId(resolvedModel)) {
    await enqueueLogEnrich(messageId, reqId);
    drainSoon();
  }
}

async function bumpConversationTotals(
  convId: string,
  metadata: ChatMessageMetadata | null,
  now: Date,
): Promise<void> {
  const usage = metadata?.usage;
  if (usage) {
    await bumpLocalConversationTotals(convId, {
      inputTokens: usage.inputTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
      cost: usage.cost ?? 0,
    });
  }
  await updateLocalConversationSettings({
    convId,
    ...(metadata?.vars != null ? { vars: metadata.vars } : {}),
    ...(metadata?.summary
      ? {
          summaryMemory: metadata.summary.summary,
          summaryAnchor: metadata.summary.anchor,
        }
      : {}),
    updatedAt: now,
  });
}

async function fireIllustrator(
  queryClient: QueryClient,
  job: IllustratorJob,
  args: {
    convId: string;
    messageId: string;
    responseText: string;
  },
): Promise<void> {
  try {
    const { runIllustrator } =
      await import("@/components/pages/sidebar/chat/illustrator/run");
    await runIllustrator({
      convId: args.convId,
      messageId: args.messageId,
      taskId: job.taskId,
      responseText: args.responseText,
      utilityModel: job.utilityModel,
      promptInstruction: job.settings.promptInstruction,
      imageModel: job.settings.imageModel,
      imageGroup: job.settings.imageGroup,
      refMediaIds: job.settings.refMediaIds,
      reviewPrompt: job.settings.imagePreview
        ? requestImagePromptReview
        : undefined,
    });
  } catch (err) {
    handleError(err);
  } finally {
    invalidateAndBroadcast(queryClient, [queryKeys.chatMessages(args.convId)]);
    // The open thread renders its live array, not the rows just rewritten.
    if (!chatStore.get(chatRunningAtom)) {
      await reloadLiveThreadFromDb(args.convId);
    }
  }
}

// assistant-ui appends a turn only once it completes, so a stream that never
// terminates persists NEITHER side. append() dedups on message id.
export type PersistTurn = (
  message: object,
  parentId: string | null,
) => Promise<void>;

const pendingAppends = new Map<string, Promise<void>>();

export function createChatHistoryAdapter(
  queryClient: QueryClient,
  getConvId: () => string | null,
  onFormatReady?: (persist: PersistTurn) => void,
): ThreadHistoryAdapter {
  return {
    async load() {
      throw new Error(
        "chat-history-adapter: outer load() should not be called; use withFormat()",
      );
    },

    async append() {
      throw new Error(
        "chat-history-adapter: outer append() should not be called; use withFormat()",
      );
    },

    withFormat<TMessage, TStorageFormat extends Record<string, unknown>>(
      formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>,
    ) {
      const format = {
        async load(): Promise<MessageFormatRepository<TMessage>> {
          try {
            const id = getConvId();
            if (!id) return { messages: [] };

            const cached = queryClient.getQueryData<ApiMessage[]>(
              queryKeys.chatMessages(id),
            );
            const stored = await repairBrokenChain(
              id,
              cached ?? (await readJoinedMessages(id)),
            );

            // assistant-ui replaces the live list with whatever load() returns,
            // and on a new chat it loads while the first turn is streaming, so
            // the turn's own messages must ride along or the user's message
            // vanishes and the reply lands as a sibling of its stored row.
            const thread = getThreadRuntime()?.getState();
            const allMessages = thread?.isRunning
              ? withLiveTurn<TMessage>(id, stored, thread.messages, (m) =>
                  toEncoded(
                    formatAdapter.encode({ message: m, parentId: null }),
                  ),
                )
              : stored;
            logChatDebug("history.load", {
              convId: id,
              convIdAtom: chatStore.get(convIdAtom),
              count: stored.length,
              source: cached ? "cache" : "db",
              live: thread?.messages.length ?? null,
              running: thread?.isRunning ?? null,
              merged: allMessages.length - stored.length,
            });
            return buildRepository(allMessages, formatAdapter);
          } finally {
            chatStore.set(historyLoadedAtom, true);
          }
        },

        // The user turn is persisted as the request leaves and again by the
        // runtime; run concurrently, both miss the row and store its parts twice.
        append(item: MessageFormatItem<TMessage>) {
          const messageId = formatAdapter.getId(item.message);
          const run = (pendingAppends.get(messageId) ?? Promise.resolve()).then(
            () => appendNow(item),
          );
          const settled = run.catch(() => {});
          pendingAppends.set(messageId, settled);
          void settled.then(() => {
            if (pendingAppends.get(messageId) === settled)
              pendingAppends.delete(messageId);
          });
          return run;
        },
      };

      const appendNow = async (item: MessageFormatItem<TMessage>) => {
        const id = getConvId();
        if (!id) return;

        const messageId = formatAdapter.getId(item.message);
        // A group turn and auto-continue stream into the SAME message, so the
        // row exists and now holds the next speaker's parts too.
        const existingRow = ((await readLocalMessages(id)) ?? []).find(
          (m) => m.id === messageId,
        );
        const content = toEncoded(formatAdapter.encode(item));
        logChatDebug("history.append", {
          convId: id,
          convIdAtom: chatStore.get(convIdAtom),
          messageId,
          role: content.role,
          parentId: item.parentId ?? null,
          existing: !!existingRow,
        });
        if (existingRow && content.role !== "assistant") return;
        const isAssistant = content.role === "assistant";
        const originalAssistantText = assistantTextOf(content);

        const parts = isAssistant
          ? await applyAssistantOutputTransforms(id, content.parts)
          : content.parts;
        const items = partsToItems(parts);
        const resolvedModel = isAssistant ? chatStore.get(chatModelAtom) : null;

        if (isAssistant) {
          appendStreamErrorItem(items, resolvedModel);
          if (items.length === 0) return;
        }

        const illustratorJob =
          isAssistant && !existingRow && originalAssistantText.trim()
            ? await prepareIllustratorJob(id, items, resolvedModel)
            : null;

        const now = dayjs().toDate();
        const metadata =
          (item.message as { metadata?: ChatMessageMetadata }).metadata ?? null;
        const usage = metadata?.usage ?? null;
        const varsWriteback = metadata?.vars ?? null;
        await persistInlayMedia(id, metadata);
        if (metadata?.globalVars != null) {
          chatStore.set(globalVarsAtom, metadata.globalVars);
        }

        const speakingCharId = isAssistant
          ? (metadata?.speakingCharacterId ??
            chatStore.get(speakingCharacterIdAtom))
          : null;

        const placement = existingRow
          ? {
              parentId: existingRow.parentId ?? null,
              parentBranchVars: existingRow.branchVars ?? null,
              nextBranchIndex: existingRow.branchIndex ?? 0,
            }
          : await placeOnBranch(
              id,
              messageId,
              item.parentId ?? null,
              now,
              content.role,
            );
        const turnVars = isAssistant
          ? (varsWriteback ?? placement.parentBranchVars)
          : placement.parentBranchVars;
        const branchVars = isAssistant
          ? ((await runOutputTriggers(id, parts, turnVars)) ?? turnVars)
          : turnVars;
        const newMessage = {
          ...(existingRow ?? {}),
          id: messageId,
          convId: id,
          parentId: placement.parentId,
          role: content.role,
          model: resolvedModel,
          characterId: existingRow?.characterId ?? speakingCharId,
          inputTokens:
            (existingRow?.inputTokens ?? 0) + (usage?.inputTokens ?? 0) || null,
          outputTokens:
            (existingRow?.outputTokens ?? 0) + (usage?.outputTokens ?? 0) ||
            null,
          cost: (existingRow?.cost ?? 0) + (usage?.cost ?? 0) || null,
          isActiveBranch: true,
          isEdited: false,
          branchIndex: placement.nextBranchIndex,
          branchVars,
          createdAt: existingRow?.createdAt ?? now,
          updatedAt: now,
        };
        const existingConv = await readLocalConversation(id);
        if (!existingConv) {
          await upsertLocalConversation({
            id,
            title: null,
            totalInputTokens: 0,
            totalOutputTokens: 0,
            totalCost: 0,
            createdAt: now,
            defaultModel: resolvedModel ?? chatStore.get(chatModelAtom) ?? "",
            updatedAt: now,
          });
        }
        try {
          await upsertLocalMessage(newMessage);
          logChatDebug("history.persisted", {
            convId: id,
            messageId,
            role: content.role,
          });
        } catch (e) {
          logChatDebug("history.persist_error", {
            convId: id,
            messageId,
            error: String(e).slice(0, 200),
          });
          throw e;
        }

        const itemRows = items.map((it, seq) => ({
          id: uid(),
          messageId,
          sequenceIndex: seq,
          outputIndex: null,
          type: it.type,
          data: it.data,
          createdAt: now,
        }));
        if (existingRow) {
          await replaceLocalMessageItems(messageId, itemRows);
        } else {
          for (const row of itemRows) {
            await upsertLocalMessageItem(row);
          }
        }

        await persistRequestLog(
          queryClient,
          id,
          messageId,
          metadata,
          resolvedModel,
          now,
        );
        await bumpConversationTotals(id, metadata, now);
        invalidateAndBroadcast(queryClient, [
          queryKeys.chatMeta(id),
          queryKeys.chatMessages(id),
          queryKeys.conversations(),
        ]);

        if (isAssistant && !existingRow && originalAssistantText.trim()) {
          void autoplayReply(
            id,
            messageId,
            originalAssistantText,
            speakingCharId,
          ).catch((e) => handleError(e));
        }

        if (illustratorJob) {
          // The placeholder went to the DB only; the open thread renders its live copy.
          replaceMessageParts(messageId, (parts) => [
            ...parts,
            {
              type: "data-task",
              data: {
                taskId: illustratorJob.taskId,
                model: illustratorJob.utilityModel,
                status: "generating",
                kind: "image",
              },
            },
          ]);
          void fireIllustrator(queryClient, illustratorJob, {
            convId: id,
            messageId,
            responseText: originalAssistantText,
          });
        }
      };

      onFormatReady?.(async (message, parentId) => {
        let messageId: string | undefined;
        try {
          messageId = formatAdapter.getId(message as TMessage);
        } catch {
          return;
        }
        if (!messageId) return;
        await format.append({ message: message as TMessage, parentId });
      });
      return format;
    },
  };
}

// Starts from the reply's own branch vars and returns the changed set, which
// becomes the reply's branchVars; null when nothing changed.
async function runOutputTriggers(
  convId: string,
  parts: MessagePart[],
  turnVars: string | null,
): Promise<string | null> {
  const triggers = await readConvTriggers(convId);
  if (triggers.length === 0) return null;
  const settings = await readLocalConversationSettings(convId);
  if (!settings) return null;
  const vars = parseStringMap(turnVars ?? settings.vars ?? null);
  const before = JSON.stringify(vars);
  const globalVars = parseStringMap(chatStore.get(globalVarsAtom));
  const globalsBefore = JSON.stringify(globalVars);
  const replyText = assistantTextOf({ role: "assistant", parts });

  const ctx = makeTriggerContext({
    mode: "output",
    vars,
    globalVars,
    chat: [{ role: "assistant", data: replyText }],
    ops: makeClientTriggerOps(),
  });
  await runTriggers(triggers, "output", ctx);
  if (ctx.sendAIprompt) {
    const thread = getThreadRuntime();
    const tip = thread?.getState().messages.at(-1);
    if (thread && tip) thread.startRun({ parentId: tip.id });
  }

  const globalsAfter = JSON.stringify(globalVars);
  if (globalsAfter !== globalsBefore) {
    chatStore.set(globalVarsAtom, globalsAfter);
  }
  const after = JSON.stringify(vars);
  if (after === before) return null;
  await updateLocalConversationSettings({ convId, vars: after });
  return after;
}
