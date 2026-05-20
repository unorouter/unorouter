"use client";

import { msg } from "@/lib/config/constants";
import type { ConversationExportFormat } from "@/lib/validation/rp";
import { uid } from "@/lib/utils/base";
import dayjs from "dayjs";
import {
  readLocalConversationBundle,
  upsertLocalConversationBundle,
} from "./chat";
import {
  upsertLocalCharacter,
  upsertLocalLorebookBundle,
  upsertLocalPersona,
  upsertLocalPreset,
} from "./rp";

const NATIVE_VERSION = "unorouter.1.0";
const ORPG_VERSION = "orpg.3.0";

type AnyRow = Record<string, unknown> & { id: string };

// --- Export -------------------------------------------------------------

export async function exportLocalConversation(
  userId: number | undefined,
  convId: string,
  format: ConversationExportFormat,
) {
  const native = await buildNativeExport(userId, convId);
  return format === "orpg" ? toOrpg(native) : native;
}

async function buildNativeExport(userId: number | undefined, convId: string) {
  const bundle = await readLocalConversationBundle(userId, convId);
  if (!bundle) throw new Error(msg("ERRORS.NOT_FOUND"));

  // Bundle resolves lorebooks as { lorebook, entries }; flatten for the
  // native envelope, which keeps lorebooks and lorebookEntries separate.
  const lorebooks = bundle.lorebooks.map((b) => b.lorebook);
  const lorebookEntries = bundle.lorebooks.flatMap((b) => b.entries);

  return {
    version: NATIVE_VERSION,
    exportedAt: new Date().toISOString(),
    conversation: bundle.conversation,
    settings: bundle.settings,
    messages: bundle.messages,
    items: bundle.messageItems,
    characters: bundle.characters,
    persona: bundle.personas[0] ?? null,
    preset: bundle.presets[0] ?? null,
    lorebooks,
    lorebookEntries,
    bindings: {
      characters: bundle.conversationCharacters,
      lorebooks: bundle.conversationLorebooks,
    },
  };
}

type NativeExport = Awaited<ReturnType<typeof buildNativeExport>>;

// orpg.3.0: openrouter-compatible subset; lossless extras live under
// _unorouter_extension.
function toOrpg(native: NativeExport) {
  const itemsByMsg = new Map<string, NativeExport["items"]>();
  for (const it of native.items) {
    const arr = itemsByMsg.get(it.messageId as string) ?? [];
    arr.push(it);
    itemsByMsg.set(it.messageId as string, arr);
  }

  const orpgCharacters: Record<string, unknown> = {};
  for (const c of native.characters) {
    orpgCharacters[c.id as string] = {
      id: c.id,
      model: null,
      description: c.description ?? null,
      includeDefaultSystemPrompt: true,
      isStreaming: true,
      samplingParameters: {},
      chatMemory:
        (native.settings as Record<string, unknown> | null)?.chatMemory ?? 8,
      isDisabled: false,
      isRemoved: false,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      plugins: [],
    };
  }

  const orpgMessages: Record<string, unknown> = {};
  const orpgItems: Record<string, unknown> = {};
  for (const m of native.messages) {
    orpgMessages[m.id as string] = {
      id: m.id,
      characterId: m.characterId ?? (m.role === "user" ? "USER" : null),
      contentType: "text",
      context: "main-chat",
      parentMessageId: m.parentId,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      isRetrying: false,
      isEdited: m.isEdited,
      isCollapsed: false,
      type: m.role,
      isGenerating: false,
      metadata: m.playgroundId
        ? {
            plugins: [],
            variantSlug: m.model,
            playgroundId: m.playgroundId,
            duration: m.durationMs ?? 0,
            tokensCount:
              ((m.inputTokens as number) ?? 0) +
              ((m.outputTokens as number) ?? 0),
            tokensPerSecond: m.tokensPerSecond ?? 0,
            cost: String(m.cost ?? 0),
          }
        : undefined,
      items: (itemsByMsg.get(m.id as string) ?? []).map((it) => ({
        id: it.id,
        outputIndex: it.outputIndex ?? 0,
        type: it.type === "tool_call" ? "tool_call" : it.type,
        sequenceIndex: it.sequenceIndex,
      })),
    };
    for (const it of itemsByMsg.get(m.id as string) ?? []) {
      orpgItems[it.id as string] = {
        id: it.id,
        messageId: it.messageId,
        data: it.data,
      };
    }
  }

  return {
    version: ORPG_VERSION,
    title:
      (native.conversation as Record<string, unknown>).title ?? "",
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

// --- SillyTavern export -------------------------------------------------

type STMetadata = {
  user_name: string;
  character_name: string;
  create_date: string;
  chat_metadata?: Record<string, unknown>;
};

type STMessage = {
  name: string;
  is_user: boolean;
  is_system?: boolean;
  send_date: string;
  mes: string;
  extra?: {
    reasoning?: string;
    token_count?: number;
    model?: string;
    [k: string]: unknown;
  };
  swipe_id?: number;
  swipes?: string[];
};

// Linear active branch: follow parentId from the last active-branch tip.
function walkActiveBranch(messages: AnyRow[], items: AnyRow[]) {
  const itemsByMsg = new Map<string, AnyRow[]>();
  for (const it of items) {
    const key = it.messageId as string;
    const arr = itemsByMsg.get(key) ?? [];
    arr.push(it);
    itemsByMsg.set(key, arr);
  }
  for (const arr of itemsByMsg.values()) {
    arr.sort(
      (a, b) =>
        ((a.sequenceIndex as number) ?? 0) -
        ((b.sequenceIndex as number) ?? 0),
    );
  }

  const ordered = [...messages].sort((a, b) => {
    const ta = new Date(a.createdAt as string).getTime();
    const tb = new Date(b.createdAt as string).getTime();
    return ta - tb;
  });
  const byId = new Map(ordered.map((m) => [m.id as string, m]));
  const tip = [...ordered].reverse().find((m) => m.isActiveBranch !== false);
  const path: AnyRow[] = [];
  let cur = tip;
  while (cur) {
    path.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId as string) : undefined;
  }
  return { path, itemsByMsg, tipId: tip?.id as string | undefined };
}

function renderItemsAsText(items: AnyRow[]): string {
  const parts: string[] = [];
  for (const it of items) {
    const data = it.data as Record<string, unknown>;
    if (it.type === "text" && typeof data.text === "string") {
      parts.push(data.text);
    } else if (it.type === "image" || it.type === "file") {
      const url = typeof data.url === "string" ? data.url : "";
      if (url) parts.push(`![${it.type}](${url})`);
    } else if (it.type === "task") {
      const tid = typeof data.task_id === "string" ? data.task_id : "";
      parts.push(`*[task ${tid}]*`);
    }
    // reasoning rides through extra.reasoning; tool calls have no ST equivalent.
  }
  return parts.join("\n\n").trim();
}

export async function exportLocalConversationSillyTavern(
  userId: number | undefined,
  convId: string,
): Promise<{ data: string; filename: string }> {
  const bundle = await readLocalConversationBundle(userId, convId);
  if (!bundle) throw new Error(msg("ERRORS.NOT_FOUND"));

  const conv = bundle.conversation as Record<string, unknown>;
  const { path, itemsByMsg, tipId } = walkActiveBranch(
    bundle.messages as AnyRow[],
    bundle.messageItems as AnyRow[],
  );

  const characterName =
    (bundle.characters[0] as Record<string, unknown> | undefined)?.name ??
    "Assistant";
  const userName = "User";

  const metadata: STMetadata = {
    user_name: userName,
    character_name: String(characterName),
    create_date: new Date(
      (conv.createdAt as string) ?? Date.now(),
    ).toISOString(),
    chat_metadata: { chatIdHash: conv.id, lastInContextMessageId: tipId },
  };

  const lines: string[] = [JSON.stringify(metadata)];

  for (const m of path) {
    if (m.role === "system") continue;
    const items = itemsByMsg.get(m.id as string) ?? [];
    const text = renderItemsAsText(items);
    const reasoning = items.find((it) => it.type === "reasoning")?.data as
      | { text?: string }
      | undefined;

    const line: STMessage = {
      name:
        m.role === "user"
          ? userName
          : m.role === "assistant"
            ? String(characterName)
            : String(m.role),
      is_user: m.role === "user",
      is_system: false,
      send_date: new Date(
        (m.createdAt as string) ?? Date.now(),
      ).toISOString(),
      mes: text,
      extra: {
        ...(reasoning?.text ? { reasoning: reasoning.text } : {}),
        ...(m.outputTokens != null
          ? { token_count: m.outputTokens as number }
          : {}),
        ...(m.model ? { model: m.model as string } : {}),
      },
    };
    lines.push(JSON.stringify(line));
  }

  const slug =
    String(conv.title ?? "chat")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .slice(0, 60) || "chat";
  return {
    data: lines.join("\n") + "\n",
    filename: `${slug}.sillytavern.jsonl`,
  };
}

// --- Import -------------------------------------------------------------

export async function importLocalConversation(
  userId: number | undefined,
  file: File,
): Promise<{ id: string }> {
  const text = await file.text();

  // ST JSONL is line-delimited; detect before JSON.parse.
  if (looksLikeSillyTavernChat(text)) {
    return importSillyTavernChat(userId, text);
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(msg("ERRORS.IMPORT_INVALID_JSON"));
  }

  if (parsed.version === NATIVE_VERSION) {
    return importNative(userId, parsed);
  }
  if (parsed.version === ORPG_VERSION) {
    return importOrpg(userId, parsed);
  }
  throw new Error(msg("ERRORS.IMPORT_UNSUPPORTED_VERSION"));
}

// Remap entity ids on import so a re-import doesn't collide with existing rows.
function buildIdMap(
  items: ReadonlyArray<Record<string, unknown>> | undefined,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const it of items ?? []) {
    if (typeof it.id === "string") map.set(it.id, uid());
  }
  return map;
}

type NativeImportShape = {
  conversation: { id?: string; title?: string | null };
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
  userId: number | undefined,
  data: Record<string, unknown>,
): Promise<{ id: string }> {
  const native = data as unknown as NativeImportShape;

  const newConvId = uid();
  const charIdMap = buildIdMap(native.characters);
  const lbIdMap = buildIdMap(native.lorebooks);
  const personaIdMap = buildIdMap(native.persona ? [native.persona] : []);
  const presetIdMap = buildIdMap(native.preset ? [native.preset] : []);
  const msgIdMap = buildIdMap(native.messages);

  // RP entities first so the conversation_* foreign keys resolve.
  if (native.persona) {
    await upsertLocalPersona(userId, {
      id: personaIdMap.get(native.persona.id as string)!,
      name: native.persona.name as string,
      description: (native.persona.description as string | null) ?? null,
      avatarMediaId: null,
      isDefault: false,
    });
  }
  if (native.preset) {
    await upsertLocalPreset(userId, {
      id: presetIdMap.get(native.preset.id as string)!,
      name: native.preset.name as string,
      temperature: (native.preset.temperature as number | null) ?? null,
      topP: (native.preset.topP as number | null) ?? null,
      topK: (native.preset.topK as number | null) ?? null,
      minP: (native.preset.minP as number | null) ?? null,
      topA: (native.preset.topA as number | null) ?? null,
      frequencyPenalty:
        (native.preset.frequencyPenalty as number | null) ?? null,
      presencePenalty: (native.preset.presencePenalty as number | null) ?? null,
      repetitionPenalty:
        (native.preset.repetitionPenalty as number | null) ?? null,
      maxTokens: (native.preset.maxTokens as number | null) ?? null,
      isDefault: false,
    });
  }
  for (const c of native.characters) {
    await upsertLocalCharacter(userId, {
      id: charIdMap.get(c.id as string)!,
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
    const newLbId = lbIdMap.get(l.id as string)!;
    const entries = native.lorebookEntries
      .filter((e) => e.lorebookId === l.id)
      .map((e) => ({
        id: uid(),
        lorebookId: newLbId,
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
      }));
    await upsertLocalLorebookBundle(userId, {
      lorebook: {
        id: newLbId,
        name: l.name as string,
        description: (l.description as string | null) ?? null,
        scanDepth: (l.scanDepth as number | undefined) ?? 4,
        tokenBudget: (l.tokenBudget as number | undefined) ?? 1500,
        recursiveScanning:
          (l.recursiveScanning as boolean | undefined) ?? false,
      },
      entries,
    });
  }

  const conversationCharacters = native.bindings.characters
    .map((b) => {
      const newCharId = charIdMap.get(b.characterId as string);
      if (!newCharId) return null;
      return {
        convId: newConvId,
        characterId: newCharId,
        orderIndex: (b.orderIndex as number | undefined) ?? 0,
        isActive: (b.isActive as boolean | undefined) ?? true,
        overrides: (b.overrides as Record<string, unknown> | null) ?? null,
      };
    })
    .filter((b) => b != null);
  const conversationLorebooks = native.bindings.lorebooks
    .map((b) => {
      const newLbId = lbIdMap.get(b.lorebookId as string);
      if (!newLbId) return null;
      return {
        convId: newConvId,
        lorebookId: newLbId,
        orderIndex: (b.orderIndex as number | undefined) ?? 0,
      };
    })
    .filter((b) => b != null);

  const messageRows = native.messages.map((m) => {
    const oldParent = m.parentId as string | null;
    const oldChar = m.characterId as string | null;
    return {
      id: msgIdMap.get(m.id as string)!,
      convId: newConvId,
      parentId: oldParent ? (msgIdMap.get(oldParent) ?? null) : null,
      characterId: oldChar ? (charIdMap.get(oldChar) ?? null) : null,
      role: m.role as string,
      model: (m.model as string | null) ?? null,
      playgroundId: (m.playgroundId as string | null) ?? null,
      inputTokens: (m.inputTokens as number | null) ?? null,
      outputTokens: (m.outputTokens as number | null) ?? null,
      cost: (m.cost as number | null) ?? null,
      durationMs: (m.durationMs as number | null) ?? null,
      tokensPerSecond: (m.tokensPerSecond as number | null) ?? null,
      branchIndex: (m.branchIndex as number | undefined) ?? 0,
      isActiveBranch: (m.isActiveBranch as boolean | undefined) ?? true,
      isEdited: (m.isEdited as boolean | undefined) ?? false,
    };
  });
  const messageItemRows = native.items.map((it) => ({
    id: uid(),
    messageId: msgIdMap.get(it.messageId as string)!,
    sequenceIndex: it.sequenceIndex as number,
    outputIndex: (it.outputIndex as number | null) ?? null,
    type: it.type as string,
    data: it.data,
  }));

  await upsertLocalConversationBundle(userId, {
    conversation: { id: newConvId, title: native.conversation.title ?? null },
    settings: {
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
    },
    conversationCharacters,
    conversationLorebooks,
    messages: messageRows,
    messageItems: messageItemRows,
    media: [],
  });

  return { id: newConvId };
}

// orpg.3.0 (openrouter): lossy on lorebooks/personas.
async function importOrpg(
  userId: number | undefined,
  data: Record<string, unknown>,
): Promise<{ id: string }> {
  const newConvId = uid();
  const ext =
    (data._unorouter_extension as Record<string, unknown> | undefined) ?? {};
  const orpgCharacters =
    (data.characters as Record<string, Record<string, unknown>>) ?? {};
  const orpgMessages =
    (data.messages as Record<string, Record<string, unknown>>) ?? {};
  const orpgItems =
    (data.items as Record<string, Record<string, unknown>>) ?? {};

  const firstChar = Object.values(orpgCharacters)[0];
  const defaultModel =
    (firstChar?.model as string | undefined) ?? "openrouter/auto";

  const charIdMap = new Map(
    Object.keys(orpgCharacters).map((id) => [id, uid()]),
  );
  const msgIdMap = new Map(Object.keys(orpgMessages).map((id) => [id, uid()]));

  for (const [oldId, c] of Object.entries(orpgCharacters)) {
    await upsertLocalCharacter(userId, {
      id: charIdMap.get(oldId)!,
      name: (c.name as string | undefined) ?? "Imported character",
      description: (c.description as string | null) ?? null,
    });
  }

  const lbs = ext.lorebooks as Array<Record<string, unknown>> | undefined;
  const lbEntries = ext.lorebookEntries as
    | Array<Record<string, unknown>>
    | undefined;
  const lbMap = new Map<string, string>();
  for (const l of lbs ?? []) {
    const newId = uid();
    lbMap.set(l.id as string, newId);
    const entries = (lbEntries ?? [])
      .filter((e) => e.lorebookId === l.id)
      .map((e) => ({
        id: uid(),
        lorebookId: newId,
        keys: e.keys as string[],
        content: e.content as string,
      }));
    await upsertLocalLorebookBundle(userId, {
      lorebook: {
        id: newId,
        name: l.name as string,
        description: (l.description as string | null) ?? null,
      },
      entries,
    });
  }

  const conversationCharacters = Object.keys(orpgCharacters).map((oldId) => ({
    convId: newConvId,
    characterId: charIdMap.get(oldId)!,
    orderIndex: 0,
    isActive: true,
  }));
  const conversationLorebooks = Array.from(lbMap.values()).map((lbId) => ({
    convId: newConvId,
    lorebookId: lbId,
  }));

  const messageRows = Object.values(orpgMessages).map((m) => {
    const oldParent = m.parentMessageId as string | null;
    const oldChar = m.characterId as string | null;
    const newChar =
      oldChar && oldChar !== "USER" ? (charIdMap.get(oldChar) ?? null) : null;
    const meta = m.metadata as Record<string, unknown> | undefined;
    return {
      id: msgIdMap.get(m.id as string)!,
      convId: newConvId,
      parentId: oldParent ? (msgIdMap.get(oldParent) ?? null) : null,
      characterId: newChar,
      role: (m.type as string | undefined) ?? "user",
      model: (meta?.variantSlug as string | null) ?? null,
      playgroundId: (meta?.playgroundId as string | null) ?? null,
      cost: meta?.cost ? Number(meta.cost) : null,
      durationMs: (meta?.duration as number | null) ?? null,
      tokensPerSecond: (meta?.tokensPerSecond as number | null) ?? null,
      isEdited: (m.isEdited as boolean | undefined) ?? false,
    };
  });

  const messageItemRows: AnyRow[] = [];
  for (const m of Object.values(orpgMessages)) {
    const newMsgId = msgIdMap.get(m.id as string)!;
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
      let itemPayload: unknown;
      if (ourType === "text") {
        // OpenRouter: user content is input_text, assistant is output_text.
        const content = itemData.content;
        if (typeof content === "string") {
          itemPayload = { text: content };
        } else if (Array.isArray(content)) {
          const part = content.find((p) => {
            const tp = (p as Record<string, unknown>).type;
            return tp === "output_text" || tp === "input_text";
          });
          itemPayload = {
            text:
              typeof part === "object" && part
                ? String((part as Record<string, unknown>).text ?? "")
                : "",
          };
        } else {
          itemPayload = { text: "" };
        }
      } else if (ourType === "reasoning") {
        const content = itemData.content as
          | Array<Record<string, unknown>>
          | undefined;
        const reasoningText = content?.find((p) => p.type === "reasoning_text");
        itemPayload = {
          text:
            typeof reasoningText?.text === "string"
              ? reasoningText.text
              : "",
        };
      } else {
        itemPayload = itemData;
      }
      messageItemRows.push({
        id: uid(),
        messageId: newMsgId,
        sequenceIndex: seq++,
        outputIndex: (ref.outputIndex as number | null) ?? null,
        type: ourType,
        data: itemPayload,
      });
    }
  }

  await upsertLocalConversationBundle(userId, {
    conversation: {
      id: newConvId,
      title: (data.title as string | undefined) ?? null,
    },
    settings: { convId: newConvId, defaultModel },
    conversationCharacters,
    conversationLorebooks,
    messages: messageRows,
    messageItems: messageItemRows,
    media: [],
  });

  return { id: newConvId };
}

// --- SillyTavern import -------------------------------------------------

function parseStDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  // SillyTavern send_date is ISO in some exporters, epoch ms in others.
  const d = dayjs(/^\d+$/.test(raw) ? Number(raw) : raw);
  return d.isValid() ? d.toDate() : null;
}

export function looksLikeSillyTavernChat(text: string): boolean {
  const firstLine = text.split("\n").find((l) => l.trim().length > 0);
  if (!firstLine) return false;
  try {
    const parsed = JSON.parse(firstLine.trim());
    return (
      (typeof parsed.user_name === "string" &&
        typeof parsed.character_name === "string") ||
      typeof parsed.mes === "string"
    );
  } catch {
    return false;
  }
}

// Linear active branch; swipes collapsed to the active one.
async function importSillyTavernChat(
  userId: number | undefined,
  text: string,
): Promise<{ id: string }> {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) throw new Error(msg("ERRORS.REQUEST_FAILED"));

  let metadata: STMetadata | null = null;
  try {
    metadata = JSON.parse(lines[0]) as STMetadata;
  } catch {
    metadata = null;
  }

  // Some exporters skip the metadata line; detect by `mes`/`is_user` shape.
  const messageLines: string[] = metadata?.user_name ? lines.slice(1) : lines;

  const stMessages: STMessage[] = [];
  for (const ln of messageLines) {
    try {
      const parsed = JSON.parse(ln) as STMessage;
      if (typeof parsed.mes === "string") stMessages.push(parsed);
    } catch {
      // skip unparseable lines
    }
  }

  if (stMessages.length === 0) throw new Error(msg("ERRORS.REQUEST_FAILED"));

  const newConvId = uid();
  const now = dayjs();
  const title =
    metadata?.character_name && metadata?.user_name
      ? `${metadata.character_name} (imported)`
      : "Imported chat";

  const messageRows: AnyRow[] = [];
  const messageItemRows: AnyRow[] = [];
  let prevId: string | null = null;
  for (let i = 0; i < stMessages.length; i++) {
    const m = stMessages[i];
    const role = m.is_user ? "user" : m.is_system ? "system" : "assistant";
    const messageId = uid();
    const createdAt = parseStDate(m.send_date) ?? now.add(i, "ms").toDate();

    messageRows.push({
      id: messageId,
      convId: newConvId,
      parentId: prevId,
      role,
      model: m.extra?.model ?? null,
      outputTokens: m.extra?.token_count ?? null,
      createdAt,
      updatedAt: createdAt,
    });

    let seq = 0;
    if (m.extra?.reasoning) {
      messageItemRows.push({
        id: uid(),
        messageId,
        sequenceIndex: seq++,
        outputIndex: null,
        type: "reasoning",
        data: { text: m.extra.reasoning },
      });
    }
    if (m.mes) {
      messageItemRows.push({
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

  await upsertLocalConversationBundle(userId, {
    conversation: { id: newConvId, title },
    settings: { convId: newConvId, defaultModel: "" },
    conversationCharacters: [],
    conversationLorebooks: [],
    messages: messageRows,
    messageItems: messageItemRows,
    media: [],
  });

  return { id: newConvId };
}
