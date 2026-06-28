import type { ApiMessage, MessagePart } from "@/lib/ai/chat/messages";
import { isCustomModelId } from "@/lib/ai/chat/custom-provider-id";
import {
  itemsToParts,
  joinItemsToMessages,
  partsToItems,
  walkActiveBranch,
} from "@/lib/ai/chat/messages";
import { upsertLocalMedia } from "@/lib/db/client/data/media";
import {
  readConvRegexScripts,
  readConvTriggers,
  readLocalConversation,
  readLocalConversationSettings,
  readLocalMessageItems,
  readLocalMessages,
  upsertLocalConversation,
  upsertLocalConversationSettings,
  upsertLocalMessage,
  upsertLocalMessageItem,
} from "@/lib/db/client/data/chat";
import { runRegexScripts } from "@/lib/ai/chat/regex-scripts";
import { makeTriggerContext, runTriggers } from "@/lib/ai/chat/triggers/vm";
import type { TriggerScript } from "@/lib/ai/chat/triggers/types";
import { makeClientTriggerOps } from "./trigger-ops-client";
import { insertLocalRequestLog } from "@/lib/db/client/data/request-log";
import {
  drainSoon,
  enqueueLogEnrich,
} from "@/lib/db/client/sync/pending/queue";
import type { RequestLogRow } from "@/lib/db/schema/rows";
import { queryKeys } from "@/lib/react-query/keys";
import type { ChatMessageMetadata } from "@/lib/types";
import { parseStringMap, uid } from "@/lib/utils/base";
import { dayjs } from "@/lib/utils/format/date";
import {
  chatHelpersAtom,
  chatModelAtom,
  chatStore,
  convIdAtom,
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

// Encoded storage shape; encode is opaque, narrow through `unknown`.
type EncodedContent = {
  role: "system" | "user" | "assistant" | "tool";
  parts: MessagePart[];
};

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

export function createChatHistoryAdapter(
  queryClient: QueryClient,
  getUserId: () => number,
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
            const userId = getUserId();

            type MsgPage = { messages: ApiMessage[]; total: number };
            type Cached = { pages: MsgPage[]; pageParams: number[] };

            let allMessages: ApiMessage[] = [];
            const cached = queryClient.getQueryData<Cached>(
              queryKeys.chatMessages(id),
            );
            if (cached) {
              allMessages = cached.pages.flatMap((p) => p.messages);
            } else {
              const msgs = (await readLocalMessages(userId, id)) ?? [];
              const items = (await readLocalMessageItems(userId, id)) ?? [];
              allMessages = joinItemsToMessages(msgs, items);
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
          const userId = getUserId();
          if (!id) return;

          const messageId = formatAdapter.getId(item.message);
          logChatDebug("history.append", {
            convId: id,
            convIdAtom: chatStore.get(convIdAtom),
            messageId,
            role: (item.message as { role?: string }).role,
          });
          // Idempotency guard: re-appending a persisted message would re-parent it and cycle the branch tree.
          {
            const existingRows = (await readLocalMessages(userId, id)) ?? [];
            if (existingRows.some((m) => m.id === messageId)) return;
          }
          const content = formatAdapter.encode(
            item,
          ) as unknown as EncodedContent;

          // Original assistant text (pre regex/Lua mutation) - the illustrator writes its image prompt from this.
          const originalAssistantText =
            content.role === "assistant"
              ? content.parts
                  .filter(
                    (p): p is MessagePart & { text: string } =>
                      p.type === "text" && typeof p.text === "string",
                  )
                  .map((p) => p.text)
                  .join("\n")
              : "";

          // Primary character's editoutput scripts run on the finished assistant text before persist.
          let parts = content.parts;
          if (content.role === "assistant") {
            const scripts = await readConvRegexScripts(userId, id);
            if (scripts.length > 0) {
              parts = parts.map((p) =>
                p.type === "text" && typeof p.text === "string"
                  ? {
                      ...p,
                      text: runRegexScripts(p.text, scripts, "editoutput"),
                    }
                  : p,
              );
            }
            // Output-mode triggers run after the assistant reply; their var mutations persist to conversation vars.
            const triggers = await readConvTriggers(userId, id);
            if (triggers.length > 0) {
              // Lua listenEdit('editOutput') transforms the reply text first (Risu order: edits then triggers).
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
                parts = await Promise.all(
                  parts.map(async (p) =>
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
              await runOutputTriggers(userId, id, triggers, parts);
            }
          }
          const items = partsToItems(parts);
          const resolvedModel =
            content.role === "assistant" ? chatStore.get(chatModelAtom) : null;

          if (content.role === "assistant") {
            // Failed run: persist the attempt as an error node so partial text survives. 30s window scopes the atom.
            const streamError = chatStore.get(lastStreamErrorAtom);
            // Media handlers already emit a `data-error` part; don't double up.
            const hasErrorItem = items.some((it) => it.type === "error");
            if (streamError && Date.now() - streamError.at < 30_000) {
              chatStore.set(lastStreamErrorAtom, null);
              if (!hasErrorItem) {
                items.push({
                  type: "error",
                  data: {
                    message: streamError.message,
                    ...(resolvedModel && { model: resolvedModel }),
                    ...(streamError.code && { code: streamError.code }),
                    ...(streamError.status && { status: streamError.status }),
                    ...(streamError.requestId && {
                      requestId: streamError.requestId,
                    }),
                  },
                });
              }
            } else if (items.length === 0) {
              // Stop before first token: nothing worth a node. Skipping the persist prevents empty ghost branches.
              return;
            }
          }

          // Illustrator: append an image placeholder (a `task` item, kind:"image") on a successful assistant
          // reply when enabled. The image generates ASYNC after persist and amends this item (no reply freeze).
          let illustratorJob: { taskId: string; utilityModel: string } | null =
            null;
          if (content.role === "assistant" && originalAssistantText.trim()) {
            const convSettings = await readLocalConversationSettings(
              userId,
              id,
            );
            const s = convSettings as {
              imageEnabled?: boolean | null;
              utilityModel?: string | null;
              defaultModel?: string | null;
            } | null;
            const hasError = items.some((it) => it.type === "error");
            if (s?.imageEnabled && !hasError) {
              const taskId = uid();
              illustratorJob = {
                taskId,
                utilityModel:
                  s.utilityModel || resolvedModel || s.defaultModel || "",
              };
              items.push({
                type: "task",
                data: {
                  task_id: taskId,
                  kind: "image",
                  model: illustratorJob.utilityModel,
                  status: "generating",
                },
              });
            }
          }

          const now = dayjs().toDate();

          // usage set by the stream finish frame
          const metadata =
            (item.message as { metadata?: ChatMessageMetadata }).metadata ??
            null;
          const usage = metadata?.usage ?? null;
          const debug = metadata?.debug ?? null;
          // Chat-variable writeback from macro setvar/addvar (serialized JSON map).
          const varsWriteback = metadata?.vars ?? null;
          // Per-user global-variable writeback from setglobalvar.
          if (metadata?.inlayMedia) {
            for (const m of metadata.inlayMedia) {
              await upsertLocalMedia(userId, {
                id: m.id,
                convId: id,
                mimeType: m.mimeType,
                sizeBytes: m.sizeBytes,
                dataBase64: m.dataBase64,
                r2Key: null,
                r2Url: null,
              });
            }
          }
          if (metadata?.globalVars != null) {
            chatStore.set(globalVarsAtom, metadata.globalVars);
          }

          // Multi-character rotation: stamp who spoke. Prefer finish-frame metadata; the atom read is the fallback.
          const speakingCharId =
            content.role === "assistant"
              ? (metadata?.speakingCharacterId ??
                chatStore.get(speakingCharacterIdAtom))
              : null;

          // Null-parent fallback: a seeded greeting isn't in UI state on first send; anchor to the DB active tip.
          // Reuse the same read to find the parent branch's vars snapshot for carry-forward.
          let parentId = item.parentId ?? null;
          let parentBranchVars: string | null = null;
          {
            const existing = (await readLocalMessages(userId, id)) ?? [];
            if (existing.length > 0) {
              const tipRow = walkActiveBranch(existing).path.at(-1) as
                | { id: string; branchVars?: string | null }
                | undefined;
              if (parentId === null && tipRow) parentId = tipRow.id;
              const parentRow = parentId
                ? existing.find((m) => m.id === parentId)
                : tipRow;
              parentBranchVars =
                (parentRow as { branchVars?: string | null } | undefined)
                  ?.branchVars ?? null;
            }
          }
          // Branch-vars snapshot: the post-turn chat vars for THIS branch. Prefer the stream writeback
          // (vars changed this turn); else carry forward the PARENT branch's snapshot so sibling swipes
          // stay isolated. Only assistant turns run triggers/macros, so only they snapshot; user turns inherit.
          const branchVars =
            content.role === "assistant"
              ? (varsWriteback ?? parentBranchVars)
              : parentBranchVars;
          const newMessage = {
            id: messageId,
            convId: id,
            parentId,
            role: content.role,
            model: resolvedModel,
            characterId: speakingCharId,
            inputTokens: usage?.inputTokens ?? null,
            outputTokens: usage?.outputTokens ?? null,
            cost: usage?.cost ?? null,
            isActiveBranch: true,
            isEdited: false,
            branchIndex: 0,
            branchVars,
            createdAt: now,
            updatedAt: now,
          };
          // Seed conv row first; messages.conv_id FK requires parent.
          const existingConv = await readLocalConversation(userId, id);
          if (!existingConv) {
            await upsertLocalConversation(userId, {
              id,
              title: null,
              totalInputTokens: 0,
              totalOutputTokens: 0,
              totalCost: 0,
              syncExpiresAt: null,
              createdAt: now,
              // default_model is NOT NULL; resolvedModel is null for user turns.
              defaultModel: resolvedModel ?? chatStore.get(chatModelAtom) ?? "",
              updatedAt: now,
            });
          }
          try {
            await upsertLocalMessage(userId, newMessage);
            logChatDebug("history.persisted", {
              convId: id,
              userId,
              messageId,
              role: content.role,
            });
          } catch (e) {
            logChatDebug("history.persist_error", {
              convId: id,
              userId,
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
            await upsertLocalMessageItem(userId, row);
          }

          // Persist request snapshot for in-app debugging; FK cascade with message.
          const logRow: RequestLogRow | null = debug
            ? {
                ...debug,
                msgId: messageId,
                convId: id,
                inputTokens: usage?.inputTokens ?? null,
                outputTokens: usage?.outputTokens ?? null,
                cost: usage?.cost ?? null,
                durationMs: usage?.durationMs ?? null,
                tokensPerSecond: usage?.tokensPerSecond ?? null,
                createdAt: now,
              }
            : null;
          if (logRow) {
            await insertLocalRequestLog(userId, logRow);
            queryClient.invalidateQueries({
              queryKey: queryKeys.requestLog(messageId),
            });
            // Pull new-api's authoritative cost/tokens/channel once the log lands. Queued so a reload still resolves it.
            // Custom-provider turns bypass new-api entirely (no request id, no upstream log), so never enrich them.
            const reqId = (logRow as { requestId?: string | null }).requestId;
            if (reqId && !isCustomModelId(resolvedModel)) {
              await enqueueLogEnrich(userId, messageId, reqId);
              drainSoon(userId);
            }
          }

          const convForTotals =
            existingConv ?? (await readLocalConversation(userId, id));
          const updatedConv = {
            ...(convForTotals ?? {}),
            id,
            totalInputTokens:
              (convForTotals?.totalInputTokens ?? 0) +
              (usage?.inputTokens ?? 0),
            totalOutputTokens:
              (convForTotals?.totalOutputTokens ?? 0) +
              (usage?.outputTokens ?? 0),
            totalCost: (convForTotals?.totalCost ?? 0) + (usage?.cost ?? 0),
            // Persist chat-variable writeback when the stream reported a change; null keeps the stored value.
            ...(varsWriteback != null ? { vars: varsWriteback } : {}),
            ...(metadata?.summary
              ? {
                  summaryMemory: metadata.summary.summary,
                  summaryAnchor: metadata.summary.anchor,
                }
              : {}),
            updatedAt: now,
          };
          await upsertLocalConversation(userId, updatedConv);
          // queuedSends: a persisted user turn or its reply changes the unanswered-turn badge set.
          for (const queryKey of [
            queryKeys.chatMeta(id),
            queryKeys.chatMessages(id),
            queryKeys.conversations(),
            queryKeys.queuedSends(),
          ]) {
            queryClient.invalidateQueries({ queryKey });
          }

          // Fire the illustrator AFTER the reply is persisted + shown (async-amend; never blocks the reply).
          // It rewrites the image placeholder item to the inlay token when the image lands, then refreshes.
          if (illustratorJob) {
            const job = illustratorJob;
            void (async () => {
              try {
                const { runIllustrator } = await import("./illustrator-run");
                const s = (await readLocalConversationSettings(userId, id)) as {
                  promptInstruction?: string | null;
                } | null;
                await runIllustrator({
                  userId,
                  convId: id,
                  messageId,
                  taskId: job.taskId,
                  responseText: originalAssistantText,
                  utilityModel: job.utilityModel,
                  promptInstruction: s?.promptInstruction ?? undefined,
                });
              } catch {
                // Best-effort: a failure leaves the reply intact; the placeholder is dropped on the rewrite.
              } finally {
                queryClient.invalidateQueries({
                  queryKey: queryKeys.chatMessages(id),
                });
              }
            })();
          }
        },
      };
    },
  };
}

// Output-mode triggers after a reply: var mutations persist to the conv var store; others use their own CRUD paths.
async function runOutputTriggers(
  userId: number,
  convId: string,
  triggers: TriggerScript[],
  parts: MessagePart[],
): Promise<void> {
  const settings = await readLocalConversationSettings(userId, convId);
  if (!settings) return;
  const vars = parseStringMap(
    (settings as { vars?: string | null }).vars ?? null,
  );
  const before = JSON.stringify(vars);
  // Real per-user global vars so getglobalvar/setglobalvar work in output mode.
  const globalVars = parseStringMap(chatStore.get(globalVarsAtom));
  const globalsBefore = JSON.stringify(globalVars);
  const replyText = parts
    .filter(
      (p): p is MessagePart & { text: string } =>
        p.type === "text" && typeof (p as { text?: unknown }).text === "string",
    )
    .map((p) => p.text)
    .join("\n");

  const ctx = makeTriggerContext({
    mode: "output",
    vars,
    globalVars,
    chat: [{ role: "assistant", data: replyText }],
    ops: makeClientTriggerOps(userId),
  });
  // triggerlua runs against this context; lazy import keeps wasmoon off the chat bundle until a Lua trigger fires.
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
  // V1 sendAIprompt: chain an empty continuation send after the triggers.
  if (ctx.sendAIprompt) {
    void chatStore.get(chatHelpersAtom)?.sendEmpty();
  }

  if (JSON.stringify(vars) !== before) {
    await upsertLocalConversationSettings(userId, {
      convId,
      vars: JSON.stringify(vars),
    });
  }
  const globalsAfter = JSON.stringify(globalVars);
  if (globalsAfter !== globalsBefore) {
    chatStore.set(globalVarsAtom, globalsAfter);
  }
}
