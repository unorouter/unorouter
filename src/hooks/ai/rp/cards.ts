"use client";

import { useApiMutation } from "@/lib/react-query/hooks";

import {
  readLocalConversationBindings,
  readLocalConversationSettings,
  replaceLocalConversationBindings,
  upsertLocalConversationSettings,
} from "@/lib/db/client/data/chat/chat";
import {
  deleteLocalCard,
  readLocalCard,
  readLocalCards,
  upsertLocalCardBundle,
} from "@/lib/db/client/data/rp/rp";
import { queryKeys } from "@/lib/react-query/keys";
import type { CardBody } from "@/lib/validation/rp";
import { uid } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dayjs } from "@/lib/utils/format/date";
import { useTranslations } from "next-intl";

export function useCardsQuery() {
  return useQuery({
    queryKey: queryKeys.cards(),
    queryFn: async () => {
      return (await readLocalCards()) ?? [];
    },
  });
}

export function useCardQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.card(id ?? ""),
    queryFn: async () => {
      if (!id) throw new Error("not-found");
      const local = await readLocalCard(id);
      if (!local) throw new Error("not-found");
      return local;
    },
    enabled: !!id,
  });
}

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
        cardCharacters: (body.characterIds ?? []).map((cid, i) => ({
          cardId: card.id,
          characterId: cid,
          orderIndex: i,
        })),
        cardLorebooks: (body.lorebookIds ?? []).map((lid, i) => ({
          cardId: card.id,
          lorebookId: lid,
          orderIndex: i,
        })),
      });
      return card;
    },
    invalidates: [queryKeys.cards()],
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
        card: updatedCard as never,
        cardCharacters: characterIds.map((cid, i) => ({
          cardId: args.id,
          characterId: cid,
          orderIndex: i,
        })),
        cardLorebooks: lorebookIds.map((lid, i) => ({
          cardId: args.id,
          lorebookId: lid,
          orderIndex: i,
        })),
      });
      return updatedCard;
    },
    invalidates: (args) => [queryKeys.cards(), queryKeys.card(args.id)],
  });
}

export function useDeleteCardMutation() {
  return useApiMutation({
    mutationFn: async (id: string) => {
      await deleteLocalCard(id);
      return { id };
    },
    invalidates: [queryKeys.cards()],
    onSuccess: (_data, id, qc) => {
      qc.removeQueries({ queryKey: [...queryKeys.card(id)] });
    },
  });
}

export function useApplyCardMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      body: { convId: string; mode: "replace" | "merge" };
    }) => {
      const card = await readLocalCard(args.id);
      if (!card) throw new Error("card-not-found");

      const characterIds = card.cardCharacters.map((c) => c.characterId);
      const lorebookIds = card.cardLorebooks.map((l) => l.lorebookId);

      if (args.body.mode === "replace") {
        await replaceLocalConversationBindings(args.body.convId, {
          conversationCharacters: characterIds.map((cid) => ({
            characterId: cid,
          })),
          conversationLorebooks: lorebookIds.map((lid) => ({
            lorebookId: lid,
          })),
        });
      } else {
        const existing = await readLocalConversationBindings(args.body.convId);
        const existingChars = existing?.conversationCharacters ?? [];
        const existingLbs = existing?.conversationLorebooks ?? [];
        const existingCharIds = new Set(
          existingChars.map((c) => c.characterId),
        );
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
      }

      if (card.personaId) {
        const settings = await readLocalConversationSettings(args.body.convId);
        if (settings) {
          await upsertLocalConversationSettings({
            ...settings,
            personaId: card.personaId,
            updatedAt: dayjs().toDate(),
          });
        }
      }

      return { id: args.id };
    },
    onSuccess: (_data, args) => {
      qc.invalidateQueries({
        queryKey: queryKeys.chatBindings(args.body.convId),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.chatSettings(args.body.convId),
      });
    },
    onError: (e) => handleError(e, t),
  });
}
