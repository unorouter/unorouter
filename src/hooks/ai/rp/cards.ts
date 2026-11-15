"use client";

import { useApiMutation } from "@/lib/react-query/hooks";

import {
  readLocalConversationBindings,
  replaceLocalConversationBindings,
  updateLocalConversationSettings,
} from "@/lib/db/client/data/chat/chat";
import {
  cardStore,
  readLocalCard,
  readLocalCards,
  characterStore,
  lorebookStore,
  personaStore,
  upsertLocalCardBundle,
} from "@/lib/db/client/data/rp/rp";
import { queryKeys } from "@/lib/react-query/keys";
import type { CardBody } from "@/lib/validation/rp";
import { isRecord, uid, stringItems } from "@/lib/utils/base";
import { msg } from "@/lib/config/constants";
import { toast } from "sonner";
import { dayjs } from "@/lib/utils/format/date";
import { useTranslations } from "next-intl";
import { makeRpEntity, readJsonFile } from "./factory";

const cardLinks = (
  cardId: string,
  characterIds: string[],
  lorebookIds: string[],
) => ({
  cardCharacters: characterIds.map((characterId, orderIndex) => ({
    cardId,
    characterId,
    orderIndex,
  })),
  cardLorebooks: lorebookIds.map((lorebookId, orderIndex) => ({
    cardId,
    lorebookId,
    orderIndex,
  })),
});

const cards = makeRpEntity<
  Awaited<ReturnType<typeof readLocalCards>>[number],
  Record<string, unknown>,
  Record<string, unknown>,
  NonNullable<Awaited<ReturnType<typeof readLocalCard>>>
>({
  listKey: queryKeys.cards,
  itemKey: queryKeys.card,
  store: { ...cardStore, list: readLocalCards, get: readLocalCard },
});

export const useCardsQuery = cards.useList;
export const useCardQuery = cards.useItem;
export const useDeleteCardMutation = cards.useDelete;

export function useCreateCardMutation() {
  return useApiMutation({
    mutationFn: async (args: { body: CardBody }) => {
      const body = args.body;
      const now = dayjs().toDate();
      const card = {
        id: uid(),
        name: body.name,
        description: body.description ?? null,
        personaId: body.personaId ?? null,
        createdAt: now,
        updatedAt: now,
      };
      await upsertLocalCardBundle({
        card,
        ...cardLinks(card.id, body.characterIds ?? [], body.lorebookIds ?? []),
      });
      return card;
    },
    invalidates: [queryKeys.cards()],
    successKey: "COMMON.SAVED",
  });
}

export function useUpdateCardMutation() {
  return useApiMutation({
    mutationFn: async (args: { id: string; body: CardBody }) => {
      const existing = await readLocalCard(args.id);
      if (!existing) throw new Error("not-found");
      const body = args.body;
      const now = dayjs().toDate();
      const updatedCard = {
        ...existing,
        ...body,
        cardCharacters: undefined,
        cardLorebooks: undefined,
        updatedAt: now,
      };
      const characterIds =
        body.characterIds ?? existing.cardCharacters.map((c) => c.characterId);
      const lorebookIds =
        body.lorebookIds ?? existing.cardLorebooks.map((l) => l.lorebookId);
      await upsertLocalCardBundle({
        card: updatedCard,
        ...cardLinks(args.id, characterIds, lorebookIds),
      });
      return updatedCard;
    },
    invalidates: (args) => [queryKeys.cards(), queryKeys.card(args.id)],
    successKey: "COMMON.SAVED",
  });
}

export function useApplyCardMutation() {
  return useApiMutation({
    mutationFn: async (args: {
      id: string;
      body: { convId: string; mode: "replace" | "merge" };
    }) => {
      const card = await readLocalCard(args.id);
      if (!card) throw new Error("card-not-found");

      const characterIds = card.cardCharacters.map((c) => c.characterId);
      const lorebookIds = card.cardLorebooks.map((l) => l.lorebookId);

      const existing =
        args.body.mode === "merge"
          ? await readLocalConversationBindings(args.body.convId)
          : null;
      const existingChars = existing?.conversationCharacters ?? [];
      const existingLbs = existing?.conversationLorebooks ?? [];
      const existingCharIds = new Set(existingChars.map((c) => c.characterId));
      const existingLbIds = new Set(existingLbs.map((l) => l.lorebookId));
      await replaceLocalConversationBindings(args.body.convId, {
        conversationCharacters: [
          ...existingChars,
          ...characterIds
            .filter((cid) => !existingCharIds.has(cid))
            .map((cid) => ({ characterId: cid })),
        ],
        conversationLorebooks: [
          ...existingLbs,
          ...lorebookIds
            .filter((lid) => !existingLbIds.has(lid))
            .map((lid) => ({ lorebookId: lid })),
        ],
      });

      if (card.personaId) {
        await updateLocalConversationSettings({
          convId: args.body.convId,
          personaId: card.personaId,
          updatedAt: dayjs().toDate(),
        });
      }

      return { id: args.id };
    },
    invalidates: (args) => [
      queryKeys.chatBindings(args.body.convId),
      queryKeys.chatSettings(args.body.convId),
    ],
  });
}

// A card file holds IDS, not entities, so import keeps only what resolves locally.
export function useImportCardFromFileMutation() {
  const t = useTranslations();
  return useApiMutation({
    mutationFn: async (file: File) => {
      const parsed = await readJsonFile(file, msg("ERRORS.CARD_FILE_INVALID"));
      if (!isRecord(parsed) || typeof parsed.name !== "string") {
        throw new Error(msg("ERRORS.CARD_FILE_INVALID"));
      }
      const wantCharacters = stringItems(parsed.characterIds);
      const wantLorebooks = stringItems(parsed.lorebookIds);

      const [characters, lorebooks, personas] = await Promise.all([
        characterStore.list(),
        lorebookStore.list(),
        personaStore.list(),
      ]);
      const has = (list: { id: string }[] | null, id: string) =>
        (list ?? []).some((x) => x.id === id);

      const characterIds = wantCharacters.filter((id) => has(characters, id));
      const lorebookIds = wantLorebooks.filter((id) => has(lorebooks, id));
      const personaId =
        typeof parsed.personaId === "string" && has(personas, parsed.personaId)
          ? parsed.personaId
          : null;

      const id = uid();
      const now = dayjs().toDate();
      await upsertLocalCardBundle({
        card: {
          id,
          name: parsed.name,
          description:
            typeof parsed.description === "string" ? parsed.description : null,
          personaId,
          createdAt: now,
          updatedAt: now,
        },
        ...cardLinks(id, characterIds, lorebookIds),
      });
      return {
        name: parsed.name,
        missing:
          wantCharacters.length -
          characterIds.length +
          (wantLorebooks.length - lorebookIds.length),
      };
    },
    invalidates: [queryKeys.cards()],
    onSuccess: (res) => {
      if (res.missing > 0) {
        toast.warning(t("RP.CARDS_IMPORT_PARTIAL", { count: res.missing }));
      }
    },
  });
}
