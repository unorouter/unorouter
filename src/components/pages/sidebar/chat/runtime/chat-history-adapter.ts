import type { ApiMessage, MessagePart } from "@/lib/ai/chat/messages";
import { isCustomModelId } from "@/lib/ai/chat/custom-provider-id";
import {
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
  upsertLocalConversation,
  upsertLocalConversationSettings,
  upsertLocalMessage,
  upsertLocalMessageItem,
  readJoinedMessages,
} from "@/lib/db/client/data/chat/chat";
import { runRegexScripts } from "@/lib/ai/chat/regex-scripts";
import type { IllustratorConvSettings } from "./illustrator-run";
import { makeTriggerContext, runTriggers } from "@/lib/ai/chat/triggers/vm";
import type { TriggerScript } from "@/lib/ai/chat/triggers/types";
import { makeClientTriggerOps } from "./trigger-ops-client";
import { insertLocalRequestLog } from "@/lib/db/client/data/chat/request-log";
import {
  drainSoon,
  enqueueLogEnrich,
} from "@/lib/db/client/outbox/pending/queue";
import type { RequestLogRow } from "@/lib/db/schema/rows";
import { queryKeys } from "@/lib/react-query/keys";
import type { ChatMessageMetadata } from "@/lib/types";
import { parseStringMap, uid } from "@/lib/utils/base";
import { dayjs } from "@/lib/utils/format/date";
import {
  chatModelAtom,
  chatStore,
  convIdAtom,
  getThreadRuntime,
  globalVarsAtom,
  historyLoadedAtom,
  lastStreamErrorAtom,
  speakingCharacterIdAtom,
} from "@/store/chat-store";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import type {
  MessageFormatAdapter,
  MessageFormatItem,
  MessageFormatRepository,
  ThreadHistoryAdapter,
} from "@assistant-ui/core";
import type { QueryClient } from "@tanstack/react-query";

type EncodedContent = {
  role: "system" | "user" | "assistant" | "tool";
  parts: MessagePart[];
};

type MessageItem = ReturnType<typeof partsToItems>[number];

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
    for (const m of repaired) {
      const { items: _items, ...row } = m;
      await upsertLocalMessage({ ...row, convId });
    }
  }
  return out;
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
    .filter(
      (p): p is MessagePart & { text: string } =>
        p.type === "text" && typeof p.text === "string",
    )
    .map((p) => p.text)
    .join("\n");
}

// Regex editoutput scripts, Lua editoutput hooks, then output-mode triggers.
async function applyAssistantOutputTransforms(
  convId: string,
  parts: MessagePart[],
): Promise<MessagePart[]> {
  let out = parts;
  const scripts = await readConvRegexScripts(convId);
  if (scripts.length > 0) {
    out = out.map((p) =>
      p.type === "text" && typeof p.text === "string"
        ? { ...p, text: runRegexScripts(p.text, scripts, "editoutput") }
        : p,
    );
  }
  const triggers = await readConvTriggers(convId);
  if (triggers.length > 0) {
    const { extractLuaCodes, runLuaEditTrigger } =
      await import("@/lib/ai/chat/triggers/lua/engine");
    const luaCodes = extractLuaCodes(triggers);
    if (luaCodes.length > 0) {
      const editCtx = makeTriggerContext({
        mode: "output",
        vars: {},
        globalVars: {},
        chat: [],
      });
      out = await Promise.all(
        out.map(async (p) =>
          p.type === "text" && typeof p.text === "string"
            ? {
                ...p,
                text: await runLuaEditTrigger(
                  luaCodes,
                  "editoutput",
                  editCtx,
                  p.text,
                ),
              }
            : p,
        ),
      );
    }
    await runOutputTriggers(convId, triggers, out);
  }
  const { hasJsHandlers, runJsEditTrigger } =
    await import("@/lib/ai/chat/plugins/engine");
  if (hasJsHandlers("output")) {
    const editCtx = makeTriggerContext({
      mode: "output",
      vars: {},
      globalVars: {},
      chat: [],
    });
    out = await Promise.all(
      out.map(async (p) =>
        p.type === "text" && typeof p.text === "string"
          ? { ...p, text: await runJsEditTrigger("output", editCtx, p.text) }
          : p,
      ),
    );
  }
  return out;
}

// A stream failure within the last 30s rides the persisted assistant turn as
// an error item so the failure survives reloads.
function appendStreamErrorItem(
  items: MessageItem[],
  resolvedModel: string | null,
): void {
  const streamError = chatStore.get(lastStreamErrorAtom);
  if (!streamError || Date.now() - streamError.at >= 30_000) return;
  chatStore.set(lastStreamErrorAtom, null);
  if (items.some((it) => it.type === "error")) return;
  items.push({
    type: "error",
    data: {
      message: streamError.message,
      ...(resolvedModel && { model: resolvedModel }),
      ...(streamError.code && { code: streamError.code }),
      ...(streamError.status && { status: streamError.status }),
      ...(streamError.requestId && { requestId: streamError.requestId }),
    },
  });
}

async function prepareIllustratorJob(
  convId: string,
  items: MessageItem[],
  resolvedModel: string | null,
): Promise<IllustratorJob | null> {
  const { resolveIllustratorSettings } = await import("./illustrator-run");
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
    // The streamed part renders before this persist runs, so the token resolver
    // has already cached its resolved-empty marker for the missing row. Drop it
    // now that the row exists, else the image stays blank until a reload.
    invalidateInlay(m.id);
  }
}

type BranchPlacement = {
  parentId: string | null;
  parentBranchVars: string | null;
  nextBranchIndex: number;
};

// Siblings already under this parent: a reroll adds a NEW branch, so the existing ones must be
// deactivated and the new one gets the next branchIndex. Without this every sibling kept
// isActiveBranch=1/branchIndex=0, so walkActiveBranch picked the wrong tip and switching branches
// rendered an empty thread.
async function placeOnBranch(
  convId: string,
  messageId: string,
  requestedParentId: string | null,
  now: Date,
): Promise<BranchPlacement> {
  let parentId = requestedParentId;
  let parentBranchVars: string | null = null;
  let siblings: NonNullable<Awaited<ReturnType<typeof readLocalMessages>>> = [];
  const existing = (await readLocalMessages(convId)) ?? [];
  if (existing.length > 0) {
    const tipRow = walkActiveBranch(existing).path.at(-1);
    if (parentId === null && tipRow) parentId = tipRow.id;
    // A requested parent that isn't persisted (greeting-sibling race, cross-tab
    // desync) would FK-fail the insert. Fall back to the active tip, else root.
    if (parentId && !existing.some((m) => m.id === parentId)) {
      parentId = tipRow?.id ?? null;
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
    await upsertLocalMessage({
      ...sib,
      isActiveBranch: false,
      updatedAt: now,
    });
  }
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
    cost: usage?.cost ?? null,
    durationMs: usage?.durationMs ?? null,
    tokensPerSecond: usage?.tokensPerSecond ?? null,
    createdAt: now,
  };
  await insertLocalRequestLog(logRow);
  queryClient.invalidateQueries({
    queryKey: queryKeys.requestLog(messageId),
  });
  const reqId = logRow.requestId;
  if (reqId && !isCustomModelId(resolvedModel)) {
    await enqueueLogEnrich(messageId, reqId);
    drainSoon();
  }
}

async function bumpConversationTotals(
  convId: string,
  existingConv: Awaited<ReturnType<typeof readLocalConversation>>,
  metadata: ChatMessageMetadata | null,
  now: Date,
): Promise<void> {
  const usage = metadata?.usage ?? null;
  const varsWriteback = metadata?.vars ?? null;
  const convForTotals = existingConv ?? (await readLocalConversation(convId));
  await upsertLocalConversation({
    ...(convForTotals ?? {}),
    id: convId,
    totalInputTokens:
      (convForTotals?.totalInputTokens ?? 0) + (usage?.inputTokens ?? 0),
    totalOutputTokens:
      (convForTotals?.totalOutputTokens ?? 0) + (usage?.outputTokens ?? 0),
    totalCost: (convForTotals?.totalCost ?? 0) + (usage?.cost ?? 0),
    ...(varsWriteback != null ? { vars: varsWriteback } : {}),
    ...(metadata?.summary
      ? {
          summaryMemory: metadata.summary.summary,
          summaryAnchor: metadata.summary.anchor,
        }
      : {}),
    updatedAt: now,
  });
}

// Fire-and-forget: the reply is already persisted; the image lands later by
// rewriting the placeholder task item (the async-amend pattern).
function fireIllustrator(
  queryClient: QueryClient,
  job: IllustratorJob,
  args: {
    convId: string;
    messageId: string;
    responseText: string;
  },
): void {
  void (async () => {
    try {
      const { runIllustrator } = await import("./illustrator-run");
      const reviewPrompt = job.settings.imagePreview
        ? (
            await import("@/components/pages/sidebar/chat/image-prompt-dialog-store")
          ).requestImagePromptReview
        : undefined;
      await runIllustrator({
        convId: args.convId,
        messageId: args.messageId,
        taskId: job.taskId,
        responseText: args.responseText,
        utilityModel: job.utilityModel,
        promptInstruction: job.settings.promptInstruction,
        imageModel: job.settings.imageModel,
        refMediaIds: job.settings.refMediaIds,
        reviewPrompt,
      });
    } catch {
    } finally {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chatMessages(args.convId),
      });
    }
  })();
}

export function createChatHistoryAdapter(
  queryClient: QueryClient,
  getConvId: () => string | null,
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
      return {
        async load(): Promise<MessageFormatRepository<TMessage>> {
          try {
            const id = getConvId();
            if (!id) return { messages: [] };

            type MsgPage = { messages: ApiMessage[]; total: number };
            type Cached = { pages: MsgPage[]; pageParams: number[] };

            let allMessages: ApiMessage[] = [];
            // The infinite query keys by [convId, userId]; getQueryData matches
            // exactly, so without the userId this always missed and the cache
            // fast-path was dead code.
            const cached = queryClient.getQueryData<Cached>([
              ...queryKeys.chatMessages(id),
            ]);
            if (cached) {
              allMessages = cached.pages.flatMap((p) => p.messages);
            } else {
              allMessages = await repairBrokenChain(
                id,
                await readJoinedMessages(id),
              );
            }

            logChatDebug("history.load", {
              convId: id,
              convIdAtom: chatStore.get(convIdAtom),
              count: allMessages.length,
              source: cached ? "cache" : "db",
            });
            return buildRepository(allMessages, formatAdapter);
          } finally {
            chatStore.set(historyLoadedAtom, true);
          }
        },

        async append(item: MessageFormatItem<TMessage>) {
          const id = getConvId();
          if (!id) return;

          const messageId = formatAdapter.getId(item.message);
          logChatDebug("history.append", {
            convId: id,
            convIdAtom: chatStore.get(convIdAtom),
            messageId,
            role: (item.message as { role?: string }).role,
          });
          {
            const existingRows = (await readLocalMessages(id)) ?? [];
            if (existingRows.some((m) => m.id === messageId)) return;
          }
          const content = formatAdapter.encode(
            item,
          ) as unknown as EncodedContent;
          const isAssistant = content.role === "assistant";
          const originalAssistantText = assistantTextOf(content);

          const parts = isAssistant
            ? await applyAssistantOutputTransforms(id, content.parts)
            : content.parts;
          const items = partsToItems(parts);
          const resolvedModel = isAssistant
            ? chatStore.get(chatModelAtom)
            : null;

          if (isAssistant) {
            appendStreamErrorItem(items, resolvedModel);
            if (items.length === 0) return;
          }

          const illustratorJob =
            isAssistant && originalAssistantText.trim()
              ? await prepareIllustratorJob(id, items, resolvedModel)
              : null;

          const now = dayjs().toDate();
          const metadata =
            (item.message as { metadata?: ChatMessageMetadata }).metadata ??
            null;
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

          const placement = await placeOnBranch(
            id,
            messageId,
            item.parentId ?? null,
            now,
          );
          const branchVars = isAssistant
            ? (varsWriteback ?? placement.parentBranchVars)
            : placement.parentBranchVars;
          const newMessage = {
            id: messageId,
            convId: id,
            parentId: placement.parentId,
            role: content.role,
            model: resolvedModel,
            characterId: speakingCharId,
            inputTokens: usage?.inputTokens ?? null,
            outputTokens: usage?.outputTokens ?? null,
            cost: usage?.cost ?? null,
            isActiveBranch: true,
            isEdited: false,
            branchIndex: placement.nextBranchIndex,
            branchVars,
            createdAt: now,
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
            id: it.id ?? uid(),
            messageId,
            sequenceIndex: seq,
            outputIndex: it.output_index ?? null,
            type: it.type,
            data: it.data,
            createdAt: now,
          }));
          for (const row of itemRows) {
            await upsertLocalMessageItem(row);
          }

          await persistRequestLog(
            queryClient,
            id,
            messageId,
            metadata,
            resolvedModel,
            now,
          );
          await bumpConversationTotals(id, existingConv, metadata, now);
          for (const queryKey of [
            queryKeys.chatMeta(id),
            queryKeys.chatMessages(id),
            queryKeys.conversations(),
          ]) {
            queryClient.invalidateQueries({ queryKey });
          }

          if (illustratorJob) {
            fireIllustrator(queryClient, illustratorJob, {
              convId: id,
              messageId,
              responseText: originalAssistantText,
            });
          }
        },
      };
    },
  };
}

async function runOutputTriggers(
  convId: string,
  triggers: TriggerScript[],
  parts: MessagePart[],
): Promise<void> {
  const settings = await readLocalConversationSettings(convId);
  if (!settings) return;
  const vars = parseStringMap(settings.vars ?? null);
  const before = JSON.stringify(vars);
  const globalVars = parseStringMap(chatStore.get(globalVarsAtom));
  const globalsBefore = JSON.stringify(globalVars);
  const replyText = parts
    .filter(
      (p): p is MessagePart & { text: string } =>
        p.type === "text" && typeof p.text === "string",
    )
    .map((p) => p.text)
    .join("\n");

  const ctx = makeTriggerContext({
    mode: "output",
    vars,
    globalVars,
    chat: [{ role: "assistant", data: replyText }],
    ops: makeClientTriggerOps(),
  });
  ctx.ops = {
    ...ctx.ops,
    runLua: async (code) => {
      const { runScripted } = await import("@/lib/ai/chat/triggers/lua/engine");
      await runScripted({
        code,
        mode: "output",
        ctx,
        lowLevelAccess: !!ctx.lowLevelAccess,
      });
    },
  };
  await runTriggers(triggers, "output", ctx);
  if (ctx.sendAIprompt) {
    const thread = getThreadRuntime();
    const tip = thread?.getState().messages.at(-1);
    if (thread && tip) thread.startRun({ parentId: tip.id });
  }

  if (JSON.stringify(vars) !== before) {
    await upsertLocalConversationSettings({
      convId,
      vars: JSON.stringify(vars),
    });
  }
  const globalsAfter = JSON.stringify(globalVars);
  if (globalsAfter !== globalsBefore) {
    chatStore.set(globalVarsAtom, globalsAfter);
  }
}
