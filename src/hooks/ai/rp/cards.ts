"use client";

import { useApiMutation } from "@/hooks/use-api-mutation";

import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import {
  readLocalConversationBindings,
  readLocalConversationSettings,
  replaceLocalConversationBindings,
  upsertLocalConversationSettings,
} from "@/lib/db/client/data/chat";
import {
  deleteLocalCard,
  readLocalCard,
  readLocalCards,
  upsertLocalCardBundle,
} from "@/lib/db/client/data/rp";
import { queryKeys } from "@/lib/react-query/keys";
import type { CardBody } from "@/lib/validation/rp";
import { uid } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dayjs } from "@/lib/utils/format/date";
import { useTranslations } from "next-intl";
import {
  mirrorConvIfSynced,
  mirrorSyncedRow,
  unmirrorIfSynced,
} from "@/lib/db/client/sync/mirror";

export function useCardsQuery() {
  const userId = useLocalUserId();
  return useQuery({
    queryKey: queryKeys.cards(),
    queryFn: async () => {
      return (await readLocalCards(userId)) ?? [];
    },
  });
}

export function useCardQuery(id: string | undefined) {
  const userId = useLocalUserId();
  return useQuery({
    queryKey: queryKeys.card(id ?? ""),
    queryFn: async () => {
      if (!id) throw new Error("not-found");
      const local = await readLocalCard(userId, id);
      if (!local) throw new Error("not-found");
      return local;
    },
    enabled: !!id,
  });
}

// Cards own bundle; factory is single-table so CRUD bespoke.
export function useCreateCardMutation() {
  const userId = useLocalUserId();
  return useApiMutation({
    mutationFn: async (args: { body: CardBody }) => {
      const body = args.body;
      const now = dayjs().toDate();
      const card = {
        id: uid(),
        userId,
        name: body.name,
        description: body.description ?? null,
        personaId: body.personaId ?? null,
        syncExpiresAt: null,
        createdAt: now,
        updatedAt: now,
      };
      await upsertLocalCardBundle(userId, {
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
  const userId = useLocalUserId();
  return useApiMutation({
    mutationFn: async (args: { id: string; body: CardBody }) => {
      const existing = await readLocalCard(userId, args.id);
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
      await upsertLocalCardBundle(userId, {
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
      if (existing.syncExpiresAt != null) {
        await mirrorSyncedRow(userId, "cards", args.id);
      }
      return updatedCard;
    },
    invalidates: (args) => [queryKeys.cards(), queryKeys.card(args.id)],
  });
}

export function useDeleteCardMutation() {
  const userId = useLocalUserId();
  return useApiMutation({
    mutationFn: async (id: string) => {
      const existing = await readLocalCard(userId, id);
      const wasSynced = existing?.syncExpiresAt != null;
      await deleteLocalCard(userId, id);
      await unmirrorIfSynced(userId, "cards", id, wasSynced);
      return { id };
    },
    invalidates: [queryKeys.cards(), queryKeys.syncState()],
    onSuccess: (_data, id, qc) => {
      qc.removeQueries({ queryKey: [...queryKeys.card(id)] });
    },
  });
}

// Apply card to conv: replace/merge bindings + optional persona seed.
export function useApplyCardMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const userId = useLocalUserId();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      body: { convId: string; mode: "replace" | "merge" };
    }) => {
      const card = await readLocalCard(userId, args.id);
      if (!card) throw new Error("card-not-found");

      const characterIds = card.cardCharacters.map((c) => c.characterId);
      const lorebookIds = card.cardLorebooks.map((l) => l.lorebookId);

      if (args.body.mode === "replace") {
        await replaceLocalConversationBindings(userId, args.body.convId, {
          conversationCharacters: characterIds.map((cid) => ({
            characterId: cid,
          })),
          conversationLorebooks: lorebookIds.map((lid) => ({
            lorebookId: lid,
          })),
        });
      } else {
        // Merge: preserve existing junction rows, append card's new ids only.
        const existing = await readLocalConversationBindings(
          userId,
          args.body.convId,
        );
        const existingChars = existing?.conversationCharacters ?? [];
        const existingLbs = existing?.conversationLorebooks ?? [];
        const existingCharIds = new Set(
          existingChars.map((c) => c.characterId),
        );
        const existingLbIds = new Set(existingLbs.map((l) => l.lorebookId));
        await replaceLocalConversationBindings(userId, args.body.convId, {
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
        const settings = await readLocalConversationSettings(
          userId,
          args.body.convId,
        );
        if (settings) {
          await upsertLocalConversationSettings(userId, {
            ...settings,
            personaId: card.personaId,
            updatedAt: dayjs().toDate(),
          });
        }
      }

      await mirrorConvIfSynced(userId, args.body.convId);
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
