import { mirrorConvDeltaIfSynced } from "@/hooks/ai/rp/shared";
import type { ApiMessage, MessagePart } from "@/lib/ai/chat/messages";
import {
  itemsToParts,
  joinItemsToMessages,
  partsToItems,
} from "@/lib/ai/chat/messages";
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
import { runTriggers } from "@/lib/ai/chat/triggers/vm";
import type {
  TriggerContext,
  TriggerScript,
} from "@/lib/ai/chat/triggers/types";
import { insertLocalRequestLog } from "@/lib/db/client/data/request-log";
import type { RequestLogRow } from "@/lib/db/schema/rows";
import { queryKeys } from "@/lib/react-query/keys";
import type { ChatMessageMetadata } from "@/lib/types";
import { parseStringMap, uid } from "@/lib/utils/base";
import { dayjs } from "@/lib/utils/format/date";
import {
  chatModelAtom,
  chatStore,
  convIdAtom,
  globalVarsAtom,
  speakingCharacterIdAtom,
} from "@/store/chat-store";
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
          const id = chatStore.get(convIdAtom);
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

          return buildRepository(allMessages, formatAdapter);
        },

        async append(item: MessageFormatItem<TMessage>) {
          const id = chatStore.get(convIdAtom);
          const userId = getUserId();
          if (!id) return;

          const messageId = formatAdapter.getId(item.message);
          const content = formatAdapter.encode(
            item,
          ) as unknown as EncodedContent;

          // editoutput regex scripts run on the finished assistant text before
          // persist (RisuAI per-chunk reprocessing analog). Scripts come from the
          // conversation's primary character. editdisplay runs at render time.
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
            // output-mode triggers run after the assistant reply; their var
            // mutations persist to conversation vars (same writeback channel).
            const triggers = await readConvTriggers(userId, id);
            if (triggers.length > 0) {
              await runOutputTriggers(userId, id, triggers, parts);
            }
          }
          const items = partsToItems(parts);
          const resolvedModel =
            content.role === "assistant" ? chatStore.get(chatModelAtom) : null;

          const now = dayjs().toDate();

          // Usage from message.metadata.usage (set by stream finish frame).
          const metadata =
            (item.message as { metadata?: ChatMessageMetadata }).metadata ??
            null;
          const usage = metadata?.usage ?? null;
          const debug = metadata?.debug ?? null;
          // Chat-variable writeback from macro setvar/addvar (serialized JSON map).
          const varsWriteback = metadata?.vars ?? null;
          // Per-user global-variable writeback from setglobalvar.
          if (metadata?.globalVars != null) {
            chatStore.set(globalVarsAtom, metadata.globalVars);
          }

          // Multi-character rotation: stamp which character spoke this turn
          // (Risu `saying`). Prefer the finish-frame metadata (per-message,
          // race-free); the atom read is the fallback for mid-stream appends.
          const speakingCharId =
            content.role === "assistant"
              ? (metadata?.speakingCharacterId ??
                chatStore.get(speakingCharacterIdAtom))
              : null;

          const newMessage = {
            id: messageId,
            convId: id,
            parentId: item.parentId ?? null,
            role: content.role,
            model: resolvedModel,
            characterId: speakingCharId,
            inputTokens: usage?.inputTokens ?? null,
            outputTokens: usage?.outputTokens ?? null,
            cost: usage?.cost ?? null,
            isActiveBranch: true,
            isEdited: false,
            branchIndex: 0,
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
          await upsertLocalMessage(userId, newMessage);

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
            // Persist chat-variable writeback (setvar/addvar) when the stream
            // reported a change; null otherwise leaves the stored value intact.
            ...(varsWriteback != null ? { vars: varsWriteback } : {}),
            // Persist rolling-summary memory update.
            ...(metadata?.summary
              ? {
                  summaryMemory: metadata.summary.summary,
                  summaryAnchor: metadata.summary.anchor,
                }
              : {}),
            updatedAt: now,
          };
          await upsertLocalConversation(userId, updatedConv);
          queryClient.invalidateQueries({ queryKey: queryKeys.chatMeta(id) });
          queryClient.invalidateQueries({
            queryKey: queryKeys.chatMessages(id),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.conversations(),
          });
          // Offline queued-send badge: a persisted user turn (or its later
          // assistant reply) changes the unanswered-turn set.
          queryClient.invalidateQueries({
            queryKey: queryKeys.queuedSends(),
          });

          await mirrorConvDeltaIfSynced(
            userId,
            id,
            {
              conversation: updatedConv,
              messages: [newMessage],
              messageItems: itemRows,
              ...(logRow ? { requestLogs: [logRow] } : {}),
            },
            "append",
          );
        },
      };
    },
  };
}

// Run output-mode trigger scripts after an assistant reply. Their var mutations
// persist to the conversation var store (the same surface macro setvar uses).
// Chat/lorebook/char mutations are out of scope here (the local DB is the source
// of truth and those are edited through their own CRUD paths).
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

  const ctx: TriggerContext = {
    mode: "output",
    vars,
    globalVars,
    chat: [{ role: "assistant", data: replyText }],
    charDesc: "",
    personaDesc: "",
    authorNote: "",
    replaceGlobalNote: "",
    lore: [],
    additionalSysPrompt: { start: "", historyend: "", promptend: "" },
    charName: "Assistant",
    userName: "User",
  };
  runTriggers(triggers, "output", ctx);

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
