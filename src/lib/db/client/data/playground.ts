"use client";

import {
  playgroundImages,
  playgroundLikes,
  playgrounds,
  playgroundSessions,
} from "@/lib/db/schema/shared";
import { desc, eq, inArray } from "drizzle-orm";
import { getLocalDb } from "../client";
import { makeTableStore } from "./table-store";

type AnyRow = Record<string, unknown> & { id: string };
type ChildRow = Record<string, unknown>;

const generationSessionStore = makeTableStore(
  playgroundSessions,
  playgroundSessions.id,
  { defaultOrderBy: desc(playgroundSessions.updatedAt) },
);

export const readLocalGenerationSessions = (userId: number) =>
  generationSessionStore.list(userId);

const readLocalGenerationSession = (userId: number, id: string) =>
  generationSessionStore.get(userId, id);

export async function readLocalGenerationSessionBundle(
  userId: number,
  sessionId: string,
) {
  const local = await getLocalDb(userId);
  if (!local) return null;
  const session = await readLocalGenerationSession(userId, sessionId);
  if (!session) return null;
  const gens = await local.db
    .select()
    .from(playgrounds)
    .where(eq(playgrounds.sessionId, sessionId));
  const genIds = gens.map((g) => g.id);
  const [imgs, likes] = genIds.length
    ? await Promise.all([
        local.db
          .select()
          .from(playgroundImages)
          .where(inArray(playgroundImages.playgroundId, genIds)),
        local.db
          .select()
          .from(playgroundLikes)
          .where(inArray(playgroundLikes.playgroundId, genIds)),
      ])
    : [[], []];
  return {
    session,
    playgrounds: gens,
    playgroundImages: imgs,
    playgroundLikes: likes,
  };
}

export async function upsertLocalGenerationSessionBundle(
  userId: number,
  bundle: {
    session: AnyRow;
    playgrounds: AnyRow[];
    playgroundImages: ChildRow[];
    playgroundLikes: ChildRow[];
  },
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await generationSessionStore.upsert(userId, bundle.session);

  await local.db
    .delete(playgrounds)
    .where(eq(playgrounds.sessionId, bundle.session.id));
  for (const g of bundle.playgrounds) {
    await local.db.insert(playgrounds).values(g as never);
  }

  for (const img of bundle.playgroundImages) {
    await local.db.insert(playgroundImages).values(img as never);
  }

  for (const l of bundle.playgroundLikes) {
    await local.db.insert(playgroundLikes).values(l as never);
  }
}
