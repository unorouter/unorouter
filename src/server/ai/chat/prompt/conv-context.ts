import { getDb } from "@/lib/db/server/client";
import {
  characters,
  conversationCharacters,
  conversationLorebooks,
  conversations,
  lorebookEntries,
  lorebooks,
  personas,
  samplingPresets,
} from "@/lib/db/schema";
import { projectConversationSettings } from "@/lib/db/conversation-settings";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { LoadedConvContext } from "@/lib/types";

    // userId scopes the conversation lookup: convId is client-controlled on the stream path, so an unscoped load let a caller assemble a prompt from another user's private context and read it back through model output. Child rows hang off this convId, so gating the parent row is sufficient.
export async function loadConvContext(userId: number, convId: string) {
  const db = getDb();

  const convRows = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, convId), eq(conversations.userId, userId)))
    .limit(1);
  const conv = convRows[0];
  if (!conv) return null;
  const settings = projectConversationSettings(conv);

  const charBindings = await db
    .select({
      characterId: conversationCharacters.characterId,
      orderIndex: conversationCharacters.orderIndex,
      isActive: conversationCharacters.isActive,
      overrides: conversationCharacters.overrides,
    })
    .from(conversationCharacters)
    .where(
      and(
        eq(conversationCharacters.convId, convId),
        eq(conversationCharacters.isActive, true),
      ),
    )
    .orderBy(asc(conversationCharacters.orderIndex));

  const charRows =
    charBindings.length > 0
      ? await db
          .select()
          .from(characters)
          .where(
            and(
              eq(characters.userId, userId),
              inArray(
                characters.id,
                charBindings.map((b) => b.characterId),
              ),
            ),
          )
      : [];
  const charById = new Map(charRows.map((c) => [c.id, c]));
  const boundCharacters = charBindings
    .map((b) => ({ binding: b, character: charById.get(b.characterId) }))
    .filter(
      (
        x,
      ): x is {
        binding: (typeof charBindings)[number];
        character: (typeof charRows)[number];
      } => !!x.character,
    );

  const [persona, preset] = await Promise.all([
    settings.personaId
      ? db
          .select()
          .from(personas)
          .where(
            and(
              eq(personas.id, settings.personaId),
              eq(personas.userId, userId),
            ),
          )
          .limit(1)
          .then((r) => r[0])
      : undefined,
    settings.presetId
      ? db
          .select()
          .from(samplingPresets)
          .where(
            and(
              eq(samplingPresets.id, settings.presetId),
              eq(samplingPresets.userId, userId),
            ),
          )
          .limit(1)
          .then((r) => r[0])
      : undefined,
  ]);

  const lbBindings = await db
    .select({ lorebookId: conversationLorebooks.lorebookId })
    .from(conversationLorebooks)
    .where(eq(conversationLorebooks.convId, convId))
    .orderBy(asc(conversationLorebooks.orderIndex));
  const lorebookIds = lbBindings.map((b) => b.lorebookId);

      // Lorebook entries inherit ownership from the parent lorebook; scope the parents and narrow the entry scan to surviving ids.
  const lbRowsRaw =
    lorebookIds.length > 0
      ? await db
          .select()
          .from(lorebooks)
          .where(
            and(
              eq(lorebooks.userId, userId),
              inArray(lorebooks.id, lorebookIds),
            ),
          )
      : [];
  const ownedLbIds = lbRowsRaw.map((lb) => lb.id);
  const [lbRows, lbEntries] =
    ownedLbIds.length > 0
      ? [
          lbRowsRaw,
          await db
            .select()
            .from(lorebookEntries)
            .where(
              and(
                inArray(lorebookEntries.lorebookId, ownedLbIds),
                eq(lorebookEntries.enabled, true),
              ),
            ),
        ]
      : [[], []];

  return { settings, boundCharacters, persona, preset, lbRows, lbEntries };
}

type ClientBoundCharacter = {
  binding: {
    characterId: string;
    orderIndex?: number | null;
    isActive?: boolean | null;
    overrides?: unknown;
  };
  character: unknown;
};

type ClientChatContext = {
  persona?: unknown;
  characters?: Array<ClientBoundCharacter>;
  lorebooks?: Array<{ lorebook: unknown; entries: Array<unknown> }>;
  preset?: unknown;
  settings?: unknown;
};

export function buildContextFromClient(
  ctx: ClientChatContext,
): LoadedConvContext {
  if (!ctx.settings) return null;
  const settings = ctx.settings as NonNullable<LoadedConvContext>["settings"];
  type Bound = NonNullable<LoadedConvContext>["boundCharacters"][number];
  const boundCharacters: Bound[] = [];
  (ctx.characters ?? []).forEach((raw, i) => {
    if (!raw?.character || raw.binding?.isActive === false) return;
    boundCharacters.push({
      binding: {
        characterId: raw.binding.characterId,
        orderIndex: raw.binding.orderIndex ?? i,
        isActive: raw.binding.isActive ?? true,
        overrides: (raw.binding.overrides ??
          null) as Bound["binding"]["overrides"],
      },
      character: raw.character as Bound["character"],
    });
  });

  const persona = (ctx.persona ?? undefined) as
    | NonNullable<LoadedConvContext>["persona"]
    | undefined;
  const preset = (ctx.preset ?? undefined) as
    | NonNullable<LoadedConvContext>["preset"]
    | undefined;

  const lbRows: NonNullable<LoadedConvContext>["lbRows"] = [];
  const lbEntries: NonNullable<LoadedConvContext>["lbEntries"] = [];
  for (const lb of ctx.lorebooks ?? []) {
    lbRows.push(lb.lorebook as (typeof lbRows)[number]);
    for (const e of lb.entries) {
      lbEntries.push(e as (typeof lbEntries)[number]);
    }
  }

  return { settings, boundCharacters, persona, preset, lbRows, lbEntries };
}
