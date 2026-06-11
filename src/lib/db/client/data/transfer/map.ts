// Pure transforms between export envelopes and DB row shapes.

import { uid } from "@/lib/utils/base";
import type {
  LocalAnyRow,
  NativeImport,
  OrpgExtension,
  OrpgImport,
  StMessage,
  StMetadata,
} from "@/lib/types";
import { ORPG_EXTENSION_KEY } from "@/lib/config/constants";
import { dayjs } from "@/lib/utils/format/date";

// Conv reduced to row objects for bundle upsert + standalone entity upserts.
export type MappedImport = {
  convId: string;
  persona: LocalAnyRow | null;
  preset: LocalAnyRow | null;
  characters: Array<LocalAnyRow>;
  lorebooks: Array<{
    lorebook: LocalAnyRow;
    entries: Array<LocalAnyRow>;
  }>;
  bundle: {
    conversation: { id: string; title: string | null };
    settings: Record<string, unknown> & { convId: string };
    conversationCharacters: Array<Record<string, unknown>>;
    conversationLorebooks: Array<Record<string, unknown>>;
    messages: Array<LocalAnyRow>;
    messageItems: Array<LocalAnyRow>;
    media: Array<LocalAnyRow>;
    requestLogs: Array<Record<string, unknown>>;
  };
};

// Typed coercion of untrusted export values; null on wrong type.
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" ? v : null);
const bool = (v: unknown): boolean | null =>
  typeof v === "boolean" ? v : null;
const strArr = (v: unknown): string[] | null =>
  Array.isArray(v) && v.every((x) => typeof x === "string")
    ? (v as string[])
    : null;

// Remap entity ids on import so a re-import does not collide with existing rows.
function buildIdMap(
  items: ReadonlyArray<{ id?: unknown }> | undefined,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const it of items ?? []) {
    if (typeof it.id === "string") map.set(it.id, uid());
  }
  return map;
}

export function mapNativeImport(native: NativeImport): MappedImport {
  const convId = uid();
  const charIdMap = buildIdMap(native.characters);
  const lbIdMap = buildIdMap(native.lorebooks);
  const personaIdMap = buildIdMap(native.persona ? [native.persona] : []);
  const presetIdMap = buildIdMap(native.preset ? [native.preset] : []);
  const msgIdMap = buildIdMap(native.messages);

  const persona = native.persona
    ? {
        id: personaIdMap.get(native.persona.id)!,
        name: str(native.persona.name) ?? "",
        description: str(native.persona.description),
        avatarMediaId: null,
        isDefault: false,
      }
    : null;

  const preset = native.preset
    ? {
        id: presetIdMap.get(native.preset.id)!,
        name: str(native.preset.name) ?? "",
        temperature: num(native.preset.temperature),
        topP: num(native.preset.topP),
        topK: num(native.preset.topK),
        minP: num(native.preset.minP),
        topA: num(native.preset.topA),
        frequencyPenalty: num(native.preset.frequencyPenalty),
        presencePenalty: num(native.preset.presencePenalty),
        repetitionPenalty: num(native.preset.repetitionPenalty),
        maxTokens: num(native.preset.maxTokens),
        isDefault: false,
      }
    : null;

  const characters = native.characters.map((c) => ({
    id: charIdMap.get(c.id)!,
    name: str(c.name) ?? "",
    description: str(c.description),
    personality: str(c.personality),
    scenario: str(c.scenario),
    firstMessage: str(c.firstMessage),
    exampleMessages: str(c.exampleMessages),
    systemPrompt: str(c.systemPrompt),
    postHistoryInstructions: str(c.postHistoryInstructions),
    tags: strArr(c.tags),
  }));

  const lorebooks = native.lorebooks.map((l) => {
    const newLbId = lbIdMap.get(l.id)!;
    return {
      lorebook: {
        id: newLbId,
        name: str(l.name) ?? "",
        description: str(l.description),
        scanDepth: num(l.scanDepth) ?? 4,
        tokenBudget: num(l.tokenBudget) ?? 1500,
        recursiveScanning: bool(l.recursiveScanning) ?? false,
      },
      entries: native.lorebookEntries
        .filter((e) => e.lorebookId === l.id)
        .map((e) => ({
          id: uid(),
          lorebookId: newLbId,
          keys: strArr(e.keys) ?? [],
          secondaryKeys: strArr(e.secondaryKeys),
          content: str(e.content) ?? "",
          constant: bool(e.constant) ?? false,
          selective: bool(e.selective) ?? false,
          priority: num(e.priority) ?? 100,
          position: str(e.position) ?? "before_char",
          depth: num(e.depth) ?? 4,
          enabled: bool(e.enabled) ?? true,
          orderIndex: num(e.orderIndex) ?? 0,
        })),
    };
  });

  const conversationCharacters = native.bindings.characters
    .map((b) => {
      const newCharId = charIdMap.get(str(b.characterId) ?? "");
      if (!newCharId) return null;
      return {
        convId,
        characterId: newCharId,
        orderIndex: num(b.orderIndex) ?? 0,
        isActive: bool(b.isActive) ?? true,
        overrides: (b.overrides as Record<string, unknown> | null) ?? null,
      };
    })
    .filter((b) => b != null);

  const conversationLorebooks = native.bindings.lorebooks
    .map((b) => {
      const newLbId = lbIdMap.get(str(b.lorebookId) ?? "");
      if (!newLbId) return null;
      return {
        convId,
        lorebookId: newLbId,
        orderIndex: num(b.orderIndex) ?? 0,
      };
    })
    .filter((b) => b != null);

  const messages = native.messages.map((m) => {
    const oldParent = str(m.parentId);
    const oldChar = str(m.characterId);
    return {
      id: msgIdMap.get(m.id)!,
      convId,
      parentId: oldParent ? (msgIdMap.get(oldParent) ?? null) : null,
      characterId: oldChar ? (charIdMap.get(oldChar) ?? null) : null,
      role: str(m.role) ?? "user",
      model: str(m.model),
      playgroundId: str(m.playgroundId),
      inputTokens: num(m.inputTokens),
      outputTokens: num(m.outputTokens),
      cost: num(m.cost),
      durationMs: num(m.durationMs),
      tokensPerSecond: num(m.tokensPerSecond),
      branchIndex: num(m.branchIndex) ?? 0,
      isActiveBranch: bool(m.isActiveBranch) ?? true,
      isEdited: bool(m.isEdited) ?? false,
    };
  });

  const messageItems = native.items.map((it) => ({
    id: uid(),
    messageId: msgIdMap.get(str(it.messageId) ?? "")!,
    sequenceIndex: num(it.sequenceIndex) ?? 0,
    outputIndex: num(it.outputIndex),
    type: str(it.type) ?? "text",
    data: it.data,
  }));

  const s = native.settings;
  return {
    convId,
    persona,
    preset,
    characters,
    lorebooks,
    bundle: {
      conversation: { id: convId, title: native.conversation.title ?? null },
      settings: {
        convId,
        defaultModel: str(s?.defaultModel) ?? "",
        personaId: persona ? persona.id : null,
        presetId: preset ? preset.id : null,
        systemPromptOverride: str(s?.systemPromptOverride),
        authorNote: str(s?.authorNote),
        authorNoteDepth: num(s?.authorNoteDepth) ?? 4,
        chatMemory: num(s?.chatMemory) ?? 8,
        reasoningEffort: str(s?.reasoningEffort),
        webSearchEnabled: bool(s?.webSearchEnabled) ?? false,
        webSearchEngine: str(s?.webSearchEngine) ?? "auto",
        webSearchContextSize: str(s?.webSearchContextSize) ?? "medium",
      },
      conversationCharacters,
      conversationLorebooks,
      messages,
      messageItems,
      media: [],
      requestLogs: [],
    },
  };
}

// Normalizes an orpg item ref + payload into our message-item type.
function orpgItemType(orpgType: string): string {
  if (orpgType === "reasoning") return "reasoning";
  if (orpgType === "tool_call") return "tool_call";
  if (orpgType === "message" || orpgType === "text") return "text";
  return orpgType;
}

function orpgTextPayload(content: unknown): { text: string } {
  if (typeof content === "string") return { text: content };
  if (Array.isArray(content)) {
    // OpenRouter: user content is input_text, assistant is output_text.
    const part = content.find((p) => {
      const tp = (p as Record<string, unknown>).type;
      return tp === "output_text" || tp === "input_text";
    });
    return {
      text:
        typeof part === "object" && part
          ? String((part as Record<string, unknown>).text ?? "")
          : "",
    };
  }
  return { text: "" };
}

export function mapOrpgImport(data: OrpgImport): MappedImport {
  const convId = uid();
  const ext = (data[ORPG_EXTENSION_KEY] as OrpgExtension | undefined) ?? {};
  const orpgCharacters = data.characters ?? {};
  const orpgMessages = data.messages ?? {};
  const orpgItems = data.items ?? {};

  const firstChar = Object.values(orpgCharacters)[0];
  const defaultModel = str(firstChar?.model) ?? "openrouter/auto";

  const charIdMap = new Map(
    Object.keys(orpgCharacters).map((id) => [id, uid()]),
  );
  const msgIdMap = new Map(Object.keys(orpgMessages).map((id) => [id, uid()]));

  const characters = Object.entries(orpgCharacters).map(([oldId, c]) => ({
    id: charIdMap.get(oldId)!,
    name: str(c.name) ?? "Imported character",
    description: str(c.description),
  }));

  const lbMap = new Map<string, string>();
  const lorebooks = (ext.lorebooks ?? []).map((l) => {
    const newId = uid();
    lbMap.set(l.id, newId);
    return {
      lorebook: {
        id: newId,
        name: str(l.name) ?? "",
        description: str(l.description),
      },
      entries: (ext.lorebookEntries ?? [])
        .filter((e) => e.lorebookId === l.id)
        .map((e) => ({
          id: uid(),
          lorebookId: newId,
          keys: strArr(e.keys) ?? [],
          content: str(e.content) ?? "",
        })),
    };
  });

  const conversationCharacters = Object.keys(orpgCharacters).map((oldId) => ({
    convId,
    characterId: charIdMap.get(oldId)!,
    orderIndex: 0,
    isActive: true,
  }));
  const conversationLorebooks = Array.from(lbMap.values()).map((lbId) => ({
    convId,
    lorebookId: lbId,
  }));

  const messages = Object.values(orpgMessages).map((m) => {
    const oldParent = str(m.parentMessageId);
    const oldChar = str(m.characterId);
    const newChar =
      oldChar && oldChar !== "USER" ? (charIdMap.get(oldChar) ?? null) : null;
    const meta = m.metadata as Record<string, unknown> | undefined;
    return {
      id: msgIdMap.get(str(m.id) ?? "")!,
      convId,
      parentId: oldParent ? (msgIdMap.get(oldParent) ?? null) : null,
      characterId: newChar,
      role: str(m.type) ?? "user",
      model: str(meta?.variantSlug),
      playgroundId: str(meta?.playgroundId),
      cost: meta?.cost != null ? Number(meta.cost) : null,
      durationMs: num(meta?.duration),
      tokensPerSecond: num(meta?.tokensPerSecond),
      isEdited: bool(m.isEdited) ?? false,
    };
  });

  const messageItems: Array<LocalAnyRow> = [];
  for (const m of Object.values(orpgMessages)) {
    const newMsgId = msgIdMap.get(m.id as string)!;
    const itemRefs = (m.items as Array<Record<string, unknown>>) ?? [];
    let seq = 0;
    for (const ref of itemRefs) {
      const itemData = orpgItems[str(ref.id) ?? ""]?.data as
        | Record<string, unknown>
        | undefined;
      if (!itemData) continue;
      const ourType = orpgItemType(
        str(ref.type) ?? str(itemData.type) ?? "text",
      );
      let payload: unknown;
      if (ourType === "text") {
        payload = orpgTextPayload(itemData.content);
      } else if (ourType === "reasoning") {
        const content = itemData.content as
          | Array<Record<string, unknown>>
          | undefined;
        const reasoningText = content?.find((p) => p.type === "reasoning_text");
        payload = {
          text:
            typeof reasoningText?.text === "string" ? reasoningText.text : "",
        };
      } else {
        payload = itemData;
      }
      messageItems.push({
        id: uid(),
        messageId: newMsgId,
        sequenceIndex: seq++,
        outputIndex: num(ref.outputIndex),
        type: ourType,
        data: payload,
      });
    }
  }

  return {
    convId,
    persona: null,
    preset: null,
    characters,
    lorebooks,
    bundle: {
      conversation: { id: convId, title: data.title ?? null },
      settings: { convId, defaultModel },
      conversationCharacters,
      conversationLorebooks,
      messages,
      messageItems,
      media: [],
      requestLogs: [],
    },
  };
}

// SillyTavern send_date is ISO in some exporters, epoch ms in others.
function parseStDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const d = dayjs(/^\d+$/.test(raw) ? Number(raw) : raw);
  return d.isValid() ? d.toDate() : null;
}

type StParsed = { metadata: StMetadata | null; messages: StMessage[] };

// Splits ST .jsonl: optional metadata header + message lines.
export function parseStJsonl(text: string): StParsed {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let metadata: StMetadata | null = null;
  try {
    metadata = JSON.parse(lines[0] ?? "") as StMetadata;
  } catch {
    metadata = null;
  }

  // Some exporters skip the metadata line; detect by `mes`/`is_user` shape.
  const messageLines = metadata?.user_name ? lines.slice(1) : lines;
  const messages: StMessage[] = [];
  for (const ln of messageLines) {
    try {
      const parsed = JSON.parse(ln) as StMessage;
      if (typeof parsed.mes === "string") messages.push(parsed);
    } catch {
      // skip unparseable lines
    }
  }
  return { metadata, messages };
}

// Maps ST messages to local rows; baseTime seeds fallback timestamp.
export function mapStImport(parsed: StParsed, baseTime: Date): MappedImport {
  const convId = uid();
  const title =
    parsed.metadata?.character_name && parsed.metadata?.user_name
      ? `${parsed.metadata.character_name} (imported)`
      : "Imported chat";

  const messages: Array<LocalAnyRow> = [];
  const messageItems: Array<LocalAnyRow> = [];
  let prevId: string | null = null;
  for (let i = 0; i < parsed.messages.length; i++) {
    const m = parsed.messages[i];
    const role = m.is_user ? "user" : m.is_system ? "system" : "assistant";
    const messageId = uid();
    const createdAt =
      parseStDate(m.send_date) ?? dayjs(baseTime).add(i, "ms").toDate();

    messages.push({
      id: messageId,
      convId,
      parentId: prevId,
      role,
      model: m.extra?.model ?? null,
      outputTokens: m.extra?.token_count ?? null,
      createdAt,
      updatedAt: createdAt,
    });

    let seq = 0;
    if (m.extra?.reasoning) {
      messageItems.push({
        id: uid(),
        messageId,
        sequenceIndex: seq++,
        outputIndex: null,
        type: "reasoning",
        data: { text: m.extra.reasoning },
      });
    }
    if (m.mes) {
      messageItems.push({
        id: uid(),
        messageId,
        sequenceIndex: seq++,
        outputIndex: null,
        type: "text",
        data: { text: m.mes },
      });
    }
    prevId = messageId;
  }

  return {
    convId,
    persona: null,
    preset: null,
    characters: [],
    lorebooks: [],
    bundle: {
      conversation: { id: convId, title },
      settings: { convId, defaultModel: "" },
      conversationCharacters: [],
      conversationLorebooks: [],
      messages,
      messageItems,
      media: [],
      requestLogs: [],
    },
  };
}
