"use client";

import { upsertLocalMedia } from "@/lib/db/client/data/media/media";
import {
  deleteLocalCharacter,
  readLocalCharacter,
  readLocalCharacters,
  upsertLocalCardBundle,
  upsertLocalCharacter,
  upsertLocalLorebookBundle,
} from "@/lib/db/client/data/rp/rp";
import { queryKeys } from "@/lib/react-query/keys";
import {
  base64ToUint8,
  handleElysia,
  uid,
  uint8ToBase64,
} from "@/lib/utils/base";
import { msg } from "@/lib/config/constants";
import { runUrlImport, type ImportedResult } from "./use-url-import";
import { useApiMutation } from "@/lib/react-query/hooks";
import { dayjs } from "@/lib/utils/format/date";
import { makeRpEntity } from "./factory";
import type { CharacterRow } from "@/lib/db/schema/rows";

const characters = makeRpEntity<
  CharacterRow,
  Record<string, unknown>,
  Record<string, unknown>
>({
  listKey: queryKeys.characters,
  itemKey: queryKeys.character,
  readList: readLocalCharacters,
  readItem: readLocalCharacter,
  upsertLocal: upsertLocalCharacter,
  deleteLocal: deleteLocalCharacter,
});

export const useCharactersQuery = characters.useList;
export const useCharacterQuery = characters.useItem;
export const useCreateCharacterMutation = characters.useCreate;
export const useUpdateCharacterMutation = characters.useUpdate;
export const useDeleteCharacterMutation = characters.useDelete;
export const useDuplicateCharacterMutation = characters.useDuplicate;

async function persistCharacterSetupFromFile(file: File) {
  const { card, imageBytes, imageMime, namedAssets } =
    await import("@/lib/ai/rp/character-card").then((m) =>
      m.parseCharacterCardFile(file),
    );

  const now = dayjs().toDate();
  const characterId = uid();

  let avatarMediaId: string | null = null;
  if (imageBytes && imageMime) {
    avatarMediaId = uid();
    await upsertLocalMedia({
      id: avatarMediaId,
      convId: null,
      mimeType: imageMime,
      sizeBytes: imageBytes.byteLength,
      dataBase64: uint8ToBase64(imageBytes),
    });
  }

  const assets: { name: string; mediaId: string }[] = [];
  for (const asset of namedAssets) {
    const mediaId = uid();
    await upsertLocalMedia({
      id: mediaId,
      convId: null,
      mimeType: asset.mime,
      sizeBytes: asset.bytes.byteLength,
      dataBase64: uint8ToBase64(asset.bytes),
    });
    assets.push({ name: asset.name, mediaId });
  }

  await upsertLocalCharacter({
    id: characterId,
    name: card.name,
    avatarMediaId,
    description: card.description ?? null,
    personality: card.personality ?? null,
    scenario: card.scenario ?? null,
    firstMessage: card.firstMessage ?? null,
    alternateGreetings: card.alternateGreetings ?? null,
    exampleMessages: card.exampleMessages ?? null,
    systemPrompt: card.systemPrompt ?? null,
    postHistoryInstructions: card.postHistoryInstructions ?? null,
    defaultReasoningEffort: null,
    tags: card.tags ?? null,
    triggers: null,
    alwaysActive: true,
    matchWholeWords: false,
    assets: assets.length > 0 ? assets : null,
    createdAt: now,
    updatedAt: now,
  });

  let lorebookId: string | null = null;
  try {
    const rawData = card.raw.data;
    const characterBook =
      rawData && typeof rawData === "object" && "character_book" in rawData
        ? rawData.character_book
        : undefined;
    if (characterBook) {
      const parsed = await import("@/lib/ai/rp/lorebook-import").then((m) =>
        m.parseLorebookJson(characterBook),
      );
      if (parsed && parsed.entries.length > 0) {
        lorebookId = uid();
        await upsertLocalLorebookBundle({
          lorebook: {
            id: lorebookId,
            name: parsed.name,
            description: parsed.description ?? null,
            scanDepth: parsed.scanDepth ?? 4,
            tokenBudget: parsed.tokenBudget ?? 1500,
            recursiveScanning: parsed.recursiveScanning ?? false,
            createdAt: now,
            updatedAt: now,
          },
          entries: parsed.entries.map((e, i) => ({
            id: uid(),
            lorebookId,
            keys: e.keys,
            secondaryKeys: e.secondaryKeys ?? null,
            content: e.content,
            constant: e.constant,
            selective: e.selective,
            priority: e.priority,
            enabled: e.enabled,
            orderIndex: e.orderIndex ?? i,
            matchWholeWords: false,
            injectionRole: "system" as const,
            createdAt: now,
            updatedAt: now,
          })),
        });
      }
    }
  } catch {
    lorebookId = null;
  }

  const cardId = uid();
  await upsertLocalCardBundle({
    card: {
      id: cardId,
      name: card.name,
      description: card.description ?? null,
      personaId: null,
      createdAt: now,
      updatedAt: now,
    },
    cardCharacters: [{ cardId, characterId, orderIndex: 0 }],
    cardLorebooks: lorebookId ? [{ cardId, lorebookId, orderIndex: 0 }] : [],
  });

  return { characterId, lorebookId, cardId };
}

const IMPORT_INVALIDATES = [
  queryKeys.characters(),
  queryKeys.lorebooks(),
  queryKeys.cards(),
];

export function useImportCharacterCardMutation() {
  return useApiMutation({
    mutationFn: (file: File) => persistCharacterSetupFromFile(file),
    invalidates: IMPORT_INVALIDATES,
  });
}

export function useImportCharacterFromUrlMutation() {
  return useApiMutation({
    mutationFn: (input: string) => runUrlImport(input, persistImportedCard),
    invalidates: IMPORT_INVALIDATES,
  });
}

// The fetcher returns a card with its lorebooks already normalised, so the card
// goes through the same file path as a drag-and-drop import and the lorebooks
// are attached afterwards rather than being re-parsed out of the PNG.
async function persistImportedCard(result: ImportedResult) {
  // Two kinds carry a card: a plain one and RisuRealm's, which also ships
  // scripts and assets. Narrowing once here is what lets every read below be
  // type-checked instead of assumed.
  if (!("card" in result)) {
    throw new Error(msg("ERRORS.CARD_IMPORT_FETCH_FAILED"));
  }
  const rich = result.kind === "rich-character" ? result : null;

  const json = JSON.stringify(result.card);
  const file = new File([json], "card.json", { type: "application/json" });
  const setup = await persistCharacterSetupFromFile(file);

  // A card fetched as JSON carries no image, and the avatar extraction in the
  // file path only reads PNGs, so without this every link import lands without
  // a picture while a dropped file keeps one. The fetcher returns the bytes it
  // already had rather than making the browser fetch them again.
  if (result.avatar) {
    const mediaId = uid();
    await upsertLocalMedia({
      id: mediaId,
      convId: null,
      mimeType: result.avatar.mimeType,
      sizeBytes: base64ToUint8(result.avatar.base64).byteLength,
      dataBase64: result.avatar.base64,
    });
    await upsertLocalCharacter({
      ...(await readLocalCharacter(setup.characterId)),
      id: setup.characterId,
      avatarMediaId: mediaId,
      updatedAt: dayjs().toDate(),
    });
  }

  const now = new Date().toISOString();
  for (const book of result.lorebooks ?? []) {
    if (book.entries.length === 0) continue;
    const lorebookId = uid();
    await upsertLocalLorebookBundle({
      lorebook: {
        id: lorebookId,
        name: book.name,
        description: null,
        scanDepth: book.scanDepth ?? 4,
        tokenBudget: 1500,
        recursiveScanning: false,
        createdAt: now,
        updatedAt: now,
      },
      entries: book.entries.map((e, i) => ({
        ...e,
        id: uid(),
        lorebookId,
        orderIndex: e.orderIndex ?? i,
        injectionRole: "system" as const,
        createdAt: now,
        updatedAt: now,
      })),
    });
  }

  // RisuRealm ships scripts and extra assets beside the card. They live on the
  // character because that is where the engine reads them from, and the file
  // path above has no way to carry them.
  const assets: { name: string; mediaId: string }[] = [];
  for (const asset of rich?.assets ?? []) {
    const mediaId = uid();
    const bytes = base64ToUint8(asset.base64);
    await upsertLocalMedia({
      id: mediaId,
      convId: null,
      mimeType: asset.mimeType,
      sizeBytes: bytes.byteLength,
      dataBase64: asset.base64,
    });
    assets.push({ name: asset.name, mediaId });
  }

  if (rich?.regexScripts || rich?.triggers || assets.length > 0) {
    const existing = await readLocalCharacter(setup.characterId);
    await upsertLocalCharacter({
      ...existing,
      id: setup.characterId,
      regexScripts: rich?.regexScripts ?? null,
      triggers: rich?.triggers ?? null,
      assets: assets.length > 0 ? assets : (existing?.assets ?? null),
      updatedAt: dayjs().toDate(),
    });
  }
  return setup;
}
