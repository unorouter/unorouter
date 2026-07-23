"use client";

import {
  exportCharacterCard,
  exportCharacterCardAsJson,
} from "@/lib/ai/rp/character-card";
import { serializeLorebookForExport } from "@/lib/ai/rp/lorebook-import";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import {
  base64ToUint8,
  exportSlug,
  uint8ToArrayBuffer,
} from "@/lib/utils/base";
import type {
  CharacterExportFormat,
  LorebookExportFormat,
} from "@/lib/validation/rp";
import {
  readLocalCard,
  readLocalCharacter,
  readLocalLorebook,
  readLocalPreset,
} from "@/lib/db/client/data/rp/rp";
import { readLocalMedia } from "@/lib/db/client/data/media/media";

type LocalExportResult = {
  blob: Blob;
  filename: string;
};

async function loadAvatar(
  userId: number | undefined,
  avatarMediaId: string | null,
): Promise<{ data: Uint8Array; mime: string } | null> {
  if (!avatarMediaId) return null;
  const row = await readLocalMedia(userId, avatarMediaId);
  if (!row) return null;
  if (row.dataBase64) {
    return { data: base64ToUint8(row.dataBase64), mime: row.mimeType };
  }
  if (row.r2Url) {
    try {
      const res = await fetch(row.r2Url);
      if (!res.ok) {
        logChatDebug("export.avatar_load_failed", {
          avatarMediaId,
          status: res.status,
        });
        return null;
      }
      return {
        data: new Uint8Array(await res.arrayBuffer()),
        mime: res.headers.get("content-type") ?? row.mimeType,
      };
    } catch (e) {
      logChatDebug("export.avatar_load_failed", {
        avatarMediaId,
        error: String(e).slice(0, 200),
      });
      return null;
    }
  }
  return null;
}

export async function exportLocalCharacter(
  userId: number | undefined,
  id: string,
  format: CharacterExportFormat,
): Promise<LocalExportResult> {
  const row = await readLocalCharacter(userId, id);
  if (!row) throw new Error("Character not found");

  const slug = exportSlug(row.name, "character");
  if (format === "json") {
    const out = exportCharacterCardAsJson(row);
    return {
      blob: new Blob([uint8ToArrayBuffer(out.data)], { type: out.mimeType }),
      filename: `${slug}.${out.ext}`,
    };
  }
  const avatar = await loadAvatar(userId, row.avatarMediaId);
  const namedAssets: { name: string; data: Uint8Array; mime: string }[] = [];
  for (const asset of row.assets ?? []) {
    const bytes = await loadAvatar(userId, asset.mediaId);
    if (bytes) {
      namedAssets.push({
        name: asset.name,
        data: bytes.data,
        mime: bytes.mime,
      });
    }
  }
  const out = exportCharacterCard(row, avatar, format, namedAssets);
  return {
    blob: new Blob([uint8ToArrayBuffer(out.data)], { type: out.mimeType }),
    filename: `${slug}.${out.ext}`,
  };
}

export async function exportLocalLorebook(
  userId: number | undefined,
  id: string,
  format: LorebookExportFormat = "sillytavern",
): Promise<LocalExportResult> {
  const book = await readLocalLorebook(userId, id);
  if (!book) throw new Error("Lorebook not found");
  const json = serializeLorebookForExport(book, book.entries, format);
  const slug = exportSlug(book.name, "lorebook");
  return {
    blob: new Blob([json], { type: "application/json" }),
    filename: `${slug}.${format}.json`,
  };
}

export async function exportLocalPreset(
  userId: number | undefined,
  id: string,
): Promise<LocalExportResult> {
  const row = await readLocalPreset(userId, id);
  if (!row) throw new Error("Preset not found");
  const portable = {
    name: row.name,
    temperature: row.temperature,
    topP: row.topP,
    topK: row.topK,
    minP: row.minP,
    topA: row.topA,
    frequencyPenalty: row.frequencyPenalty,
    presencePenalty: row.presencePenalty,
    repetitionPenalty: row.repetitionPenalty,
    maxTokens: row.maxTokens,
    extraBody: row.extraBody,
    providers: row.providers,
    promptTemplate: row.promptTemplate,
    mainPrompt: row.mainPrompt,
    postHistory: row.postHistory,
    prefill: row.prefill,
    forceAlternateRoles: row.forceAlternateRoles,
    noSystemRole: row.noSystemRole,
    mustStartWithUserInput: row.mustStartWithUserInput,
    geminiBlockOff: row.geminiBlockOff,
    isDefault: row.isDefault,
  };
  const slug = exportSlug(row.name, "preset");
  return {
    blob: new Blob([JSON.stringify(portable, null, 2)], {
      type: "application/json",
    }),
    filename: `${slug}.preset.json`,
  };
}

export async function exportLocalCard(
  userId: number | undefined,
  id: string,
): Promise<LocalExportResult> {
  const card = await readLocalCard(userId, id);
  if (!card) throw new Error("Card not found");
  const portable = {
    name: card.name,
    description: card.description,
    personaId: card.personaId,
    characterIds: card.cardCharacters
      .slice()
      .sort(
        (a, b) =>
          (a.orderIndex ?? 0) - (b.orderIndex ?? 0) ||
          a.characterId.localeCompare(b.characterId),
      )
      .map((r) => r.characterId),
    lorebookIds: card.cardLorebooks
      .slice()
      .sort(
        (a, b) =>
          (a.orderIndex ?? 0) - (b.orderIndex ?? 0) ||
          a.lorebookId.localeCompare(b.lorebookId),
      )
      .map((r) => r.lorebookId),
  };
  const slug = exportSlug(card.name, "card");
  return {
    blob: new Blob([JSON.stringify(portable, null, 2)], {
      type: "application/json",
    }),
    filename: `${slug}.card.json`,
  };
}
