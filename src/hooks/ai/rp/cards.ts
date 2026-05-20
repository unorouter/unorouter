"use client";

import { GUEST_USER_ID } from "@/lib/config/constants";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
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
import { rpc } from "@/lib/rpc";
import type { EdenArgs } from "@/lib/types/eden";
import { uid } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import {
  deleteSyncedRow,
  mirrorConvIfSynced,
  mirrorSyncedRow,
} from "./shared";

export function useCardsQuery() {
  const auth = useAuthQuery();
  return useQuery({
    queryKey: queryKeys.cards(),
    queryFn: async () => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
      return (await readLocalCards(userId)) ?? [];
    },
  });
}

export function useCardQuery(id: string | undefined) {
  const auth = useAuthQuery();
  return useQuery({
    queryKey: queryKeys.card(id ?? ""),
    queryFn: async () => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
      if (!id) throw new Error("not-found");
      const local = await readLocalCard(userId, id);
      if (!local) throw new Error("not-found");
      return local;
    },
    enabled: !!id,
  });
}

// Cards own a bundle (card + cardCharacters + cardLorebooks). The factory
// only handles single-table entities, so create / update / apply are
// bespoke.
export function useCreateCardMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (args: EdenArgs<typeof rpc.api.ai.rp.cards, "post">) => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cards() });
    },
    onError: (e) => handleError(e, t),
  });
}

export function useUpdateCardMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      body: EdenArgs<ReturnType<typeof rpc.api.ai.rp.cards>, "put">["body"];
    }) => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
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
        const fresh = await readLocalCard(userId, args.id);
        await mirrorSyncedRow(userId, "cards", args.id, {
          card: {
            ...fresh,
            cardCharacters: undefined,
            cardLorebooks: undefined,
          },
          cardCharacters: fresh?.cardCharacters ?? [],
          cardLorebooks: fresh?.cardLorebooks ?? [],
        });
      }
      return updatedCard;
    },
    onSuccess: (_data, args) => {
      qc.invalidateQueries({ queryKey: queryKeys.cards() });
      qc.invalidateQueries({ queryKey: queryKeys.card(args.id) });
    },
    onError: (e) => handleError(e, t),
  });
}

export function useDeleteCardMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (id: string) => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
      const existing = await readLocalCard(userId, id);
      const wasSynced = existing?.syncExpiresAt != null;
      await deleteLocalCard(userId, id);
      if (wasSynced) await deleteSyncedRow(userId, "cards", id);
      return { id };
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.cards() });
      qc.removeQueries({ queryKey: queryKeys.card(id) });
      qc.invalidateQueries({ queryKey: queryKeys.syncState() });
    },
    onError: (e) => handleError(e, t),
  });
}

// Apply card to a conversation: replace OR merge the conversation's
// character / lorebook bindings + optionally seed the persona on settings.
export function useApplyCardMutation() {
  const t = useTranslations();
  const qc = useQueryClient();
  const auth = useAuthQuery();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      body: { convId: string; mode: "replace" | "merge" };
    }) => {
      const userId = auth.data?.id ?? GUEST_USER_ID;
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
        const existing = await readLocalConversationBindings(
          userId,
          args.body.convId,
        );
        const existingCharIds = new Set(
          existing?.conversationCharacters.map((c) => c.characterId) ?? [],
        );
        const existingLbIds = new Set(
          existing?.conversationLorebooks.map((l) => l.lorebookId) ?? [],
        );
        await replaceLocalConversationBindings(userId, args.body.convId, {
          conversationCharacters: [
            ...(existing?.conversationCharacters ?? []),
            ...characterIds
              .filter((cid) => !existingCharIds.has(cid))
              .map((cid) => ({ characterId: cid })),
          ].map((c) => ({ characterId: c.characterId })),
          conversationLorebooks: [
            ...(existing?.conversationLorebooks ?? []),
            ...lorebookIds
              .filter((lid) => !existingLbIds.has(lid))
              .map((lid) => ({ lorebookId: lid })),
          ].map((l) => ({ lorebookId: l.lorebookId })),
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
