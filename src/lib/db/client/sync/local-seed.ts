"use client";

import { PAGE_SIZE } from "@/lib/config/constants";
import { queryKeys } from "@/lib/react-query/keys";
import type { QueryClient } from "@tanstack/react-query";
import { readLocalConversations } from "../data/chat";
import { readLocalGenerationSessions } from "../data/playground";
import {
  readLocalCards,
  readLocalCharacters,
  readLocalLorebooks,
  readLocalPersonas,
  readLocalPresets,
} from "../data/rp";

export async function stage1LocalSeed(qc: QueryClient, userId: number) {
  // Serial: SQLocal's processor mutex deadlocks on parallel callers
  // (sqlocal/dist/lib/create-mutex.js race, upstream PR pending).
  const plainSeeds = [
    [readLocalCharacters, queryKeys.characters()],
    [readLocalPersonas, queryKeys.personas()],
    [readLocalLorebooks, queryKeys.lorebooks()],
    [readLocalPresets, queryKeys.presets()],
    [readLocalCards, queryKeys.cards()],
  ] as const;
  for (const [read, key] of plainSeeds) {
    const rows = await read(userId);
    if (rows && rows.length > 0) qc.setQueryData(key, rows);
  }
  const convs = await readLocalConversations(userId);
  const genSessions = await readLocalGenerationSessions(userId);
  // Cache shapes: convs use useInfiniteQuery {pages, pageParams}; gen sessions
  // use {items}. Seeding raw arrays crashes consumers.
  if (convs && convs.length > 0) {
    qc.setQueryData(queryKeys.conversations(undefined), {
      pages: [
        { items: convs, total: convs.length, page: 1, pageSize: PAGE_SIZE },
      ],
      pageParams: [1],
    });
  }
  if (genSessions && genSessions.length > 0) {
    qc.setQueryData(queryKeys.playgroundSessionList(undefined), {
      items: genSessions,
    });
  }
}
