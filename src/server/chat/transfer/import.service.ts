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
import { uid } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import {
  importSillyTavernChat,
  looksLikeSillyTavernChat,
} from "./sillytavern-chat";

export async function importConversation(userId: number, file: File) {
  const text = await file.text();

  // SillyTavern JSONL: line-delimited, not a single JSON object. Detect first
  // so we don't fail JSON.parse on multi-line input.
  if (looksLikeSillyTavernChat(text)) {
    return importSillyTavernChat(userId, file);
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(msg("ERRORS.IMPORT_INVALID_JSON"));
  }

  if (parsed.version === "unorouter.1.0") {
    return importNative(userId, parsed);
  }
  if (parsed.version === "orpg.3.0") {
    return importOrpg(userId, parsed);
  }
  throw new Error(msg("ERRORS.IMPORT_UNSUPPORTED_VERSION"));
}

// ---------------------------------------------------------------------------
// Native: full-fidelity round-trip
// ---------------------------------------------------------------------------

/**
 * Build a Map from each item's old `id` to a freshly-generated new `id`. Used
 * by both native and orpg importers to remap entity ids so a re-import
 * doesn't collide with existing rows.
 */
function buildIdMap(
  items: ReadonlyArray<Record<string, unknown>> | undefined,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const it of items ?? []) {
    if (typeof it.id === "string") map.set(it.id, uid());
  }
  return map;
}

type NativeExport = {
  conversation: {
    id?: string;
    title?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  };
  settings: Record<string, unknown> | null;
  messages: Array<Record<string, unknown>>;
  items: Array<Record<string, unknown>>;
  characters: Array<Record<string, unknown>>;
  persona: Record<string, unknown> | null;
  preset: Record<string, unknown> | null;
  lorebooks: Array<Record<string, unknown>>;
  lorebookEntries: Array<Record<string, unknown>>;
  bindings: {
    characters: Array<Record<string, unknown>>;
    lorebooks: Array<Record<string, unknown>>;
  };
};

async function importNative(
  userId: number,
  data: Record<string, unknown>,
): Promise<{ id: string }> {
  const db = getDb();
  const native = data as unknown as NativeExport;

  const newConvId = uid();
  // ID remap for child entities to avoid collisions with existing user data.
  const charIdMap = buildIdMap(native.characters);
  const lbIdMap = buildIdMap(native.lorebooks);
  const personaIdMap = buildIdMap(native.persona ? [native.persona] : []);
  const presetIdMap = buildIdMap(native.preset ? [native.preset] : []);
  const msgIdMap = buildIdMap(native.messages);

  await db.transaction(async (tx) => {
    await tx.insert(conversations).values({
      id: newConvId,
      userId,
      title: native.conversation.title ?? null,
    });

    await tx.insert(conversationSettings).values({
      convId: newConvId,
      defaultModel: (native.settings?.defaultModel as string | undefined) ?? "",
      personaId: native.persona
        ? (personaIdMap.get(native.persona.id as string) ?? null)
        : null,
      presetId: native.preset
        ? (presetIdMap.get(native.preset.id as string) ?? null)
        : null,
      systemPromptOverride:
        (native.settings?.systemPromptOverride as string | null) ?? null,
      authorNote: (native.settings?.authorNote as string | null) ?? null,
      authorNoteDepth:
        (native.settings?.authorNoteDepth as number | undefined) ?? 4,
      chatMemory: (native.settings?.chatMemory as number | undefined) ?? 8,
      reasoningEffort:
        (native.settings?.reasoningEffort as string | null) ?? null,
      webSearchEnabled:
        (native.settings?.webSearchEnabled as boolean | undefined) ?? false,
      webSearchEngine:
        (native.settings?.webSearchEngine as string | undefined) ?? "auto",
      webSearchContextSize:
        (native.settings?.webSearchContextSize as string | undefined) ??
        "medium",
    });

    if (native.persona) {
      await tx.insert(personas).values({
        id: personaIdMap.get(native.persona.id as string)!,
        userId,
        name: native.persona.name as string,
        description: (native.persona.description as string | null) ?? null,
        avatarR2Key: null,
        isDefault: false,
      });
    }
    if (native.preset) {
      await tx.insert(samplingPresets).values({
        id: presetIdMap.get(native.preset.id as string)!,
        userId,
        name: native.preset.name as string,
        temperature: (native.preset.temperature as number | null) ?? null,
        topP: (native.preset.topP as number | null) ?? null,
        topK: (native.preset.topK as number | null) ?? null,
        minP: (native.preset.minP as number | null) ?? null,
        topA: (native.preset.topA as number | null) ?? null,
        frequencyPenalty:
          (native.preset.frequencyPenalty as number | null) ?? null,
        presencePenalty:
          (native.preset.presencePenalty as number | null) ?? null,
        repetitionPenalty:
          (native.preset.repetitionPenalty as number | null) ?? null,
        maxTokens: (native.preset.maxTokens as number | null) ?? null,
        isDefault: false,
      });
    }

    for (const c of native.characters) {
      await tx.insert(characters).values({
        id: charIdMap.get(c.id as string)!,
        userId,
        name: c.name as string,
        description: (c.description as string | null) ?? null,
        personality: (c.personality as string | null) ?? null,
        scenario: (c.scenario as string | null) ?? null,
        firstMessage: (c.firstMessage as string | null) ?? null,
        exampleMessages: (c.exampleMessages as string | null) ?? null,
        systemPrompt: (c.systemPrompt as string | null) ?? null,
        postHistoryInstructions:
          (c.postHistoryInstructions as string | null) ?? null,
        tags: (c.tags as string[] | null) ?? null,
        nsfw: (c.nsfw as boolean | undefined) ?? false,
      });
    }

    for (const l of native.lorebooks) {
      await tx.insert(lorebooks).values({
        id: lbIdMap.get(l.id as string)!,
        userId,
        name: l.name as string,
        description: (l.description as string | null) ?? null,
        scanDepth: (l.scanDepth as number | undefined) ?? 4,
        tokenBudget: (l.tokenBudget as number | undefined) ?? 1500,
        recursiveScanning:
          (l.recursiveScanning as boolean | undefined) ?? false,
      });
    }
    for (const e of native.lorebookEntries) {
      await tx.insert(lorebookEntries).values({
        id: uid(),
        lorebookId: lbIdMap.get(e.lorebookId as string)!,
        keys: e.keys as string[],
        secondaryKeys: (e.secondaryKeys as string[] | null) ?? null,
        content: e.content as string,
        constant: (e.constant as boolean | undefined) ?? false,
        selective: (e.selective as boolean | undefined) ?? false,
        priority: (e.priority as number | undefined) ?? 100,
        position: (e.position as string | undefined) ?? "before_char",
        depth: (e.depth as number | undefined) ?? 4,
        enabled: (e.enabled as boolean | undefined) ?? true,
        orderIndex: (e.orderIndex as number | undefined) ?? 0,
      });
    }

    for (const b of native.bindings.characters) {
      const newCharId = charIdMap.get(b.characterId as string);
      if (!newCharId) continue;
      await tx.insert(conversationCharacters).values({
        convId: newConvId,
        characterId: newCharId,
        orderIndex: (b.orderIndex as number | undefined) ?? 0,
        isActive: (b.isActive as boolean | undefined) ?? true,
        overrides: (b.overrides as Record<string, unknown> | null) ?? null,
      });
    }
    for (const b of native.bindings.lorebooks) {
      const newLbId = lbIdMap.get(b.lorebookId as string);
      if (!newLbId) continue;
      await tx.insert(conversationLorebooks).values({
        convId: newConvId,
        lorebookId: newLbId,
        orderIndex: (b.orderIndex as number | undefined) ?? 0,
      });
    }

    for (const m of native.messages) {
      const oldId = m.id as string;
      const newId = msgIdMap.get(oldId)!;
      const oldParent = m.parentId as string | null;
      const oldChar = m.characterId as string | null;
      await tx.insert(messages).values({
        id: newId,
        convId: newConvId,
        parentId: oldParent ? (msgIdMap.get(oldParent) ?? null) : null,
        characterId: oldChar ? (charIdMap.get(oldChar) ?? null) : null,
        role: m.role as string,
        model: (m.model as string | null) ?? null,
        generationId: (m.generationId as string | null) ?? null,
        inputTokens: (m.inputTokens as number | null) ?? null,
        outputTokens: (m.outputTokens as number | null) ?? null,
        cost: (m.cost as number | null) ?? null,
        durationMs: (m.durationMs as number | null) ?? null,
        tokensPerSecond: (m.tokensPerSecond as number | null) ?? null,
        branchIndex: (m.branchIndex as number | undefined) ?? 0,
        isActiveBranch: (m.isActiveBranch as boolean | undefined) ?? true,
        isEdited: (m.isEdited as boolean | undefined) ?? false,
      });
    }

    for (const it of native.items) {
      await tx.insert(messageItems).values({
        id: uid(),
        messageId: msgIdMap.get(it.messageId as string)!,
        sequenceIndex: it.sequenceIndex as number,
        outputIndex: (it.outputIndex as number | null) ?? null,
        type: it.type as string,
        data: it.data,
      });
    }
  });

  logger.info("Imported native export", {
    context: "chat.import.native",
    userId,
    convId: newConvId,
  });
  return { id: newConvId };
}

// ---------------------------------------------------------------------------
// orpg.3.0: from openrouter; lossy on lorebooks/personas
// ---------------------------------------------------------------------------

async function importOrpg(
  userId: number,
  data: Record<string, unknown>,
): Promise<{ id: string }> {
  const db = getDb();

  const newConvId = uid();
  const ext =
    (data._unorouter_extension as Record<string, unknown> | undefined) ?? {};
  const orpgCharacters =
    (data.characters as Record<string, Record<string, unknown>>) ?? {};
  const orpgMessages =
    (data.messages as Record<string, Record<string, unknown>>) ?? {};
  const orpgItems =
    (data.items as Record<string, Record<string, unknown>>) ?? {};

  // Pick a default model from the first character
  const firstChar = Object.values(orpgCharacters)[0];
  const defaultModel =
    (firstChar?.model as string | undefined) ?? "openrouter/auto";

  // Map orpg character/message ids → freshly-generated unorouter ids
  const charIdMap = new Map(
    Object.keys(orpgCharacters).map((id) => [id, uid()]),
  );
  const msgIdMap = new Map(Object.keys(orpgMessages).map((id) => [id, uid()]));

  await db.transaction(async (tx) => {
    await tx.insert(conversations).values({
      id: newConvId,
      userId,
      title: (data.title as string | undefined) ?? null,
    });
    await tx.insert(conversationSettings).values({
      convId: newConvId,
      defaultModel,
    });

    for (const [oldId, c] of Object.entries(orpgCharacters)) {
      await tx.insert(characters).values({
        id: charIdMap.get(oldId)!,
        userId,
        name: (c.name as string | undefined) ?? "Imported character",
        description: (c.description as string | null) ?? null,
      });
      await tx.insert(conversationCharacters).values({
        convId: newConvId,
        characterId: charIdMap.get(oldId)!,
        orderIndex: 0,
        isActive: true,
      });
    }

    for (const [oldId, m] of Object.entries(orpgMessages)) {
      const newId = msgIdMap.get(oldId)!;
      const oldParent = m.parentMessageId as string | null;
      const oldChar = m.characterId as string | null;
      const newChar =
        oldChar && oldChar !== "USER" ? (charIdMap.get(oldChar) ?? null) : null;
      const meta = m.metadata as Record<string, unknown> | undefined;
      await tx.insert(messages).values({
        id: newId,
        convId: newConvId,
        parentId: oldParent ? (msgIdMap.get(oldParent) ?? null) : null,
        characterId: newChar,
        role: (m.type as string | undefined) ?? "user",
        model: (meta?.variantSlug as string | null) ?? null,
        generationId: (meta?.generationId as string | null) ?? null,
        cost: meta?.cost ? Number(meta.cost) : null,
        durationMs: (meta?.duration as number | null) ?? null,
        tokensPerSecond: (meta?.tokensPerSecond as number | null) ?? null,
        isEdited: (m.isEdited as boolean | undefined) ?? false,
      });
    }

    // Items: orpg.items[<id>] holds the OpenAI Responses item directly
    for (const [, m] of Object.entries(orpgMessages)) {
      const oldMsgId = m.id as string;
      const newMsgId = msgIdMap.get(oldMsgId)!;
      const itemRefs = (m.items as Array<Record<string, unknown>>) ?? [];
      let seq = 0;
      for (const ref of itemRefs) {
        const itemData = orpgItems[ref.id as string]?.data as
          | Record<string, unknown>
          | undefined;
        if (!itemData) continue;
        const orpgType = (ref.type as string) ?? (itemData.type as string);
        const ourType =
          orpgType === "reasoning"
            ? "reasoning"
            : orpgType === "tool_call"
              ? "tool_call"
              : orpgType === "message" || orpgType === "text"
                ? "text"
                : orpgType;
        let data: unknown;
        if (ourType === "text") {
          // Find a content text payload. OpenRouter writes user content as
          // `input_text` and assistant content as `output_text`; both forms
          // appear in the same items map keyed by id.
          const content = itemData.content;
          if (typeof content === "string") {
            data = { text: content };
          } else if (Array.isArray(content)) {
            const t = content.find((p) => {
              const tp = (p as Record<string, unknown>).type;
              return tp === "output_text" || tp === "input_text";
            });
            data = {
              text:
                typeof t === "object" && t
                  ? String((t as Record<string, unknown>).text ?? "")
                  : "",
            };
          } else {
            data = { text: "" };
          }
        } else if (ourType === "reasoning") {
          const content = itemData.content as
            | Array<Record<string, unknown>>
            | undefined;
          const text = content?.find((p) => p.type === "reasoning_text");
          data = { text: typeof text?.text === "string" ? text.text : "" };
        } else {
          data = itemData;
        }
        await tx.insert(messageItems).values({
          id: uid(),
          messageId: newMsgId,
          sequenceIndex: seq++,
          outputIndex: (ref.outputIndex as number | null) ?? null,
          type: ourType,
          data,
        });
      }
    }

    // Honor unorouter-extension if present (lorebooks etc roundtrip)
    const lbs = ext.lorebooks as Array<Record<string, unknown>> | undefined;
    const lbEntries = ext.lorebookEntries as
      | Array<Record<string, unknown>>
      | undefined;
    if (lbs && lbs.length > 0) {
      const lbMap = new Map<string, string>();
      for (const l of lbs) {
        const newId = uid();
        lbMap.set(l.id as string, newId);
        await tx.insert(lorebooks).values({
          id: newId,
          userId,
          name: l.name as string,
          description: (l.description as string | null) ?? null,
        });
        await tx.insert(conversationLorebooks).values({
          convId: newConvId,
          lorebookId: newId,
        });
      }
      for (const e of lbEntries ?? []) {
        const newLbId = lbMap.get(e.lorebookId as string);
        if (!newLbId) continue;
        await tx.insert(lorebookEntries).values({
          id: uid(),
          lorebookId: newLbId,
          keys: e.keys as string[],
          content: e.content as string,
        });
      }
    }
  });

  logger.info("Imported orpg.3.0 export", {
    context: "chat.import.orpg",
    userId,
    convId: newConvId,
  });
  return { id: newConvId };
}
