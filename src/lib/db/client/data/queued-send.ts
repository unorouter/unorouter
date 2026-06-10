"use client";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { GUEST_USER_ID } from "@/lib/config/constants";
import { conversations, messages } from "@/lib/db/schema/shared";
import { queryKeys } from "@/lib/react-query/keys";
import { useQuery } from "@tanstack/react-query";
import { and, eq, gt, notExists } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { getLocalDb } from "../client";

export type UnansweredTurn = { convId: string; parentId: string };

// "Queued" badge detection: active-branch leaf is a user message with no active
// child or later active sibling. Detection only, no auto-replay (Risu semantics);
// self-dedups once the assistant child lands.
export async function findUnansweredUserTurns(
  userId: number | undefined,
): Promise<UnansweredTurn[]> {
  const uid = userId ?? GUEST_USER_ID;
  const local = await getLocalDb(uid);
  if (!local) return [];

  const child = alias(messages, "child");
  const later = alias(messages, "later");

  const rows = await local.db
    .select({ convId: messages.convId, parentId: messages.id })
    .from(messages)
    // userId scope lives on conversations (messages has no userId column).
    .innerJoin(
      conversations,
      and(eq(conversations.id, messages.convId), eq(conversations.userId, uid)),
    )
    .where(
      and(
        eq(messages.isActiveBranch, true),
        eq(messages.role, "user"),
        // No active child hanging off this user message.
        notExists(
          local.db
            .select({ one: child.id })
            .from(child)
            .where(
              and(
                eq(child.parentId, messages.id),
                eq(child.isActiveBranch, true),
              ),
            ),
        ),
        // No later active message in the same conversation (it is the leaf).
        notExists(
          local.db
            .select({ one: later.id })
            .from(later)
            .where(
              and(
                eq(later.convId, messages.convId),
                eq(later.isActiveBranch, true),
                gt(later.createdAt, messages.createdAt),
              ),
            ),
        ),
      ),
    );

  return rows;
}

// Set of convIds with a pending (unanswered) user turn, for UI badges. Reads
// the local DB only; invalidated by the offline-persist + replay paths.
export function useQueuedSends() {
  const auth = useAuthQuery();
  const userId = auth.data?.id ?? GUEST_USER_ID;
  return useQuery({
    queryKey: queryKeys.queuedSends(),
    queryFn: async () => {
      const turns = await findUnansweredUserTurns(userId);
      return new Set(turns.map((turn) => turn.convId));
    },
  });
}
