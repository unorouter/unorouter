"use client";

import { msg, NATIVE_VERSION, ORPG_VERSION } from "@/lib/config/constants";
import type { NativeImport, OrpgImport } from "@/lib/types/transfer";
import dayjs from "dayjs";
import {
  readLocalConversationBundle,
  upsertLocalConversationBundle,
} from "../chat";
import {
  upsertLocalCharacter,
  upsertLocalLorebookBundle,
  upsertLocalPersona,
  upsertLocalPreset,
} from "../rp";
import { mapNativeImport, mapOrpgImport, type MappedImport } from "./map";

export async function buildNativeExport(
  userId: number | undefined,
  convId: string,
) {
  const bundle = await readLocalConversationBundle(userId, convId);
  if (!bundle) throw new Error(msg("ERRORS.NOT_FOUND"));

  // Bundle resolves lorebooks as { lorebook, entries }; flatten for the
  // native envelope, which keeps lorebooks and lorebookEntries separate.
  const lorebooks = bundle.lorebooks.map((b) => b.lorebook);
  const lorebookEntries = bundle.lorebooks.flatMap((b) => b.entries);

  return {
    version: NATIVE_VERSION,
    exportedAt: dayjs().toISOString(),
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

export type NativeExport = Awaited<ReturnType<typeof buildNativeExport>>;

// Translates a local message-item `data` payload into the orpg item shape.
// Text/reasoning items store `{ text }` locally; orpg keys them under
// `content` (a string for text, a reasoning_text part array for reasoning).
function toOrpgItemData(type: string, data: unknown): unknown {
  const text =
    data && typeof data === "object" && "text" in data
      ? String((data as { text: unknown }).text ?? "")
      : "";
  if (type === "text") return { type: "text", content: text };
  if (type === "reasoning") {
    return {
      type: "reasoning",
      content: [{ type: "reasoning_text", text }],
    };
  }
  return data;
}

// orpg.3.0: openrouter-compatible subset; lossless extras live under
// _unorouter_extension.
export function toOrpg(native: NativeExport) {
  const itemsByMsg = new Map<string, NativeExport["items"]>();
  for (const it of native.items) {
    const arr = itemsByMsg.get(it.messageId) ?? [];
    arr.push(it);
    itemsByMsg.set(it.messageId, arr);
  }

  const orpgCharacters: Record<string, unknown> = {};
  for (const c of native.characters) {
    orpgCharacters[c.id] = {
      id: c.id,
      name: c.name,
      model: null,
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
      isCollapsed: false,
      type: m.role,
      isGenerating: false,
      metadata: m.playgroundId
        ? {
            plugins: [],
            variantSlug: m.model,
            playgroundId: m.playgroundId,
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
        data: toOrpgItemData(it.type, it.data),
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

// Persists a mapped import: RP entities first so the conversation_* foreign
// keys resolve, then the conversation bundle itself.
async function persistMappedImport(
  userId: number | undefined,
  mapped: MappedImport,
): Promise<{ id: string }> {
  if (mapped.persona) await upsertLocalPersona(userId, mapped.persona);
  if (mapped.preset) await upsertLocalPreset(userId, mapped.preset);
  for (const c of mapped.characters) {
    await upsertLocalCharacter(userId, c);
  }
  for (const lb of mapped.lorebooks) {
    await upsertLocalLorebookBundle(userId, lb);
  }
  await upsertLocalConversationBundle(userId, mapped.bundle);
  return { id: mapped.convId };
}

export function importNative(
  userId: number | undefined,
  native: NativeImport,
): Promise<{ id: string }> {
  return persistMappedImport(userId, mapNativeImport(native));
}

// orpg.3.0 (openrouter): lossy on lorebooks/personas.
export function importOrpg(
  userId: number | undefined,
  data: OrpgImport,
): Promise<{ id: string }> {
  return persistMappedImport(userId, mapOrpgImport(data));
}
