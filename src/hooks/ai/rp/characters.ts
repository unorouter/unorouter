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
import { msg } from "@/lib/config/constants";
import { queryKeys } from "@/lib/react-query/keys";
import {
  base64ToUint8,
  handleElysia,
  uid,
  uint8ToBase64,
} from "@/lib/utils/base";
import { rpc } from "@/lib/rpc";
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
    const characterBook = (
      card.raw as { data?: { character_book?: unknown } } | undefined
    )?.data?.character_book;
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
          } as never,
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
          })) as never,
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
    } as never,
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

// A fetch drives a real browser and may rotate its VPN exit mid-job, so the
// server hands back a job id and this polls it. The alternative, holding the
// request open, turns a slow import into a browser timeout.
const POLL_MS = 1500;
const POLL_TIMEOUT_MS = 180_000;

export function useImportCharacterFromUrlMutation() {
  return useApiMutation({
    mutationFn: async (input: string) => {
      const job = handleElysia(
        await rpc.api.ai["character-cards"].import.post({ url: input }),
      );

      const deadline = Date.now() + POLL_TIMEOUT_MS;
      for (;;) {
        if (Date.now() > deadline) throw new Error(msg("ERRORS.CARD_IMPORT_FETCH_FAILED"));
        await new Promise((r) => setTimeout(r, POLL_MS));
        const state = handleElysia(
          await rpc.api.ai["character-cards"].import({ jobId: job.jobId }).get(),
        );
        if (state.status === "failed") {
          throw new Error(state.error || msg("ERRORS.CARD_IMPORT_FETCH_FAILED"));
        }
        if (state.status !== "done" || !state.result) continue;
        return persistImportedCard(state.result);
      }
    },
    invalidates: IMPORT_INVALIDATES,
  });
}

// The fetcher returns a card plus its lorebooks already normalised, so the card
// goes through the same file path as a drag-and-drop import and the lorebooks
// are attached afterwards rather than being re-parsed out of the PNG.
async function persistImportedCard(result: {
  card: { data?: Record<string, unknown> } & Record<string, unknown>;
  lorebooks: Array<{
    name: string;
    scanDepth?: number;
    entries: Array<Record<string, unknown>>;
  }>;
}) {
  const json = JSON.stringify(result.card);
  const file = new File([json], "card.json", { type: "application/json" });
  const setup = await persistCharacterSetupFromFile(file);

  const now = new Date().toISOString();
  for (const book of result.lorebooks) {
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
      } as never,
      entries: book.entries.map((e, i) => ({
        ...e,
        id: uid(),
        lorebookId,
        orderIndex: (e.orderIndex as number | undefined) ?? i,
        injectionRole: "system" as const,
        createdAt: now,
        updatedAt: now,
      })) as never,
    });
  }
  return setup;
}
