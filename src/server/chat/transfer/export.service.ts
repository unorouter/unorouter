import { msg } from "@/lib/config/constants";
import { getDb } from "@/lib/db/client";
import {
  characters,
  conversationCharacters,
  conversationLorebooks,
  conversationSettings,
  conversations,
  lorebookEntries,
  lorebooks,
  messageItems,
  messages,
  personas,
  samplingPresets,
} from "@/lib/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";

export { exportConversationSillyTavern } from "./sillytavern-chat";

const NATIVE_VERSION = "unorouter.1.0";
const ORPG_VERSION = "orpg.3.0";

// ---------------------------------------------------------------------------
// Native: full-fidelity export of one conversation + everything bound to it
// ---------------------------------------------------------------------------

export async function exportConversationNative(
  userId: number,
  convId: string,
) {
  const db = getDb();

  const convRows = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, convId), eq(conversations.userId, userId)))
    .limit(1);
  if (convRows.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
  const conv = convRows[0];

  const settingsRows = await db
    .select()
    .from(conversationSettings)
    .where(eq(conversationSettings.convId, convId));
  const settings = settingsRows[0] ?? null;

  const msgRows = await db
    .select()
    .from(messages)
    .where(eq(messages.convId, convId))
    .orderBy(asc(messages.createdAt));
  const itemRows =
    msgRows.length > 0
      ? await db
          .select()
          .from(messageItems)
          .where(
            inArray(
              messageItems.messageId,
              msgRows.map((m) => m.id),
            ),
          )
          .orderBy(asc(messageItems.messageId), asc(messageItems.sequenceIndex))
      : [];

  const charBindings = await db
    .select()
    .from(conversationCharacters)
    .where(eq(conversationCharacters.convId, convId));
  const lbBindings = await db
    .select()
    .from(conversationLorebooks)
    .where(eq(conversationLorebooks.convId, convId));

  const charRows =
    charBindings.length > 0
      ? await db
          .select()
          .from(characters)
          .where(
            inArray(
              characters.id,
              charBindings.map((b) => b.characterId),
            ),
          )
      : [];
  const lbRows =
    lbBindings.length > 0
      ? await db
          .select()
          .from(lorebooks)
          .where(
            inArray(
              lorebooks.id,
              lbBindings.map((b) => b.lorebookId),
            ),
          )
      : [];
  const lbEntryRows =
    lbRows.length > 0
      ? await db
          .select()
          .from(lorebookEntries)
          .where(
            inArray(
              lorebookEntries.lorebookId,
              lbRows.map((b) => b.id),
            ),
          )
      : [];

  const persona = settings?.personaId
    ? (
        await db
          .select()
          .from(personas)
          .where(eq(personas.id, settings.personaId))
          .limit(1)
      )[0] ?? null
    : null;
  const preset = settings?.presetId
    ? (
        await db
          .select()
          .from(samplingPresets)
          .where(eq(samplingPresets.id, settings.presetId))
          .limit(1)
      )[0] ?? null
    : null;

  return {
    version: NATIVE_VERSION,
    exportedAt: new Date().toISOString(),
    conversation: conv,
    settings,
    messages: msgRows,
    items: itemRows,
    characters: charRows,
    persona,
    preset,
    lorebooks: lbRows,
    lorebookEntries: lbEntryRows,
    bindings: { characters: charBindings, lorebooks: lbBindings },
  };
}

// ---------------------------------------------------------------------------
// orpg.3.0: subset compatible with openrouter; lossless extras under _unorouter_extension
// ---------------------------------------------------------------------------

export async function exportConversationOrpg(userId: number, convId: string) {
  const native = await exportConversationNative(userId, convId);

  // Group items per message
  const itemsByMsg = new Map<string, typeof native.items>();
  for (const it of native.items) {
    const arr = itemsByMsg.get(it.messageId) ?? [];
    arr.push(it);
    itemsByMsg.set(it.messageId, arr);
  }

  // characters[] keyed by id
  const orpgCharacters: Record<string, unknown> = {};
  for (const c of native.characters) {
    orpgCharacters[c.id] = {
      id: c.id,
      model: c.defaultModel ?? null,
      description: c.description ?? null,
      includeDefaultSystemPrompt: true,
      isStreaming: true,
      samplingParameters: {},
      chatMemory: native.settings?.chatMemory ?? 8,
      isDisabled: false,
      isRemoved: false,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      plugins: [],
    };
  }

  // messages[] keyed by id; items[] separate
  const orpgMessages: Record<string, unknown> = {};
  const orpgItems: Record<string, unknown> = {};
  for (const m of native.messages) {
    orpgMessages[m.id] = {
      id: m.id,
      characterId: m.characterId ?? (m.role === "user" ? "USER" : null),
      contentType: "text",
      context: "main-chat",
      parentMessageId: m.parentId,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      isRetrying: false,
      isEdited: m.isEdited,
      isCollapsed: m.isCollapsed,
      type: m.role,
      isGenerating: false,
      metadata: m.generationId
        ? {
            plugins: [],
            variantSlug: m.model,
            generationId: m.generationId,
            duration: m.durationMs ?? 0,
            tokensCount: (m.inputTokens ?? 0) + (m.outputTokens ?? 0),
            tokensPerSecond: m.tokensPerSecond ?? 0,
            cost: String(m.cost ?? 0),
          }
        : undefined,
      items: (itemsByMsg.get(m.id) ?? []).map((it) => ({
        id: it.id,
        outputIndex: it.outputIndex ?? 0,
        type: it.type === "tool_call" ? "tool_call" : it.type,
        sequenceIndex: it.sequenceIndex,
      })),
    };
    for (const it of itemsByMsg.get(m.id) ?? []) {
      orpgItems[it.id] = {
        id: it.id,
        messageId: it.messageId,
        data: it.data,
      };
    }
  }

  return {
    version: ORPG_VERSION,
    title: native.conversation.title ?? "",
    characters: orpgCharacters,
    messages: orpgMessages,
    items: orpgItems,
    artifacts: {},
    artifactFiles: {},
    artifactVersions: {},
    artifactFileContents: {},
    _unorouter_extension: {
      persona: native.persona,
      preset: native.preset,
      lorebooks: native.lorebooks,
      lorebookEntries: native.lorebookEntries,
      conversationSettings: native.settings,
      bindings: native.bindings,
    },
  };
}
