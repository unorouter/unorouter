import { getDb } from "@/lib/db/server/client";
import {
  characters,
  conversationCharacters,
  conversationLorebooks,
  conversationSettings,
  lorebookEntries,
  lorebooks,
  personas,
  samplingPresets,
} from "@/lib/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { LoadedConvContext } from "@/lib/types";

export async function loadConvContext(convId: string) {
  const db = getDb();

  const settingsRows = await db
    .select()
    .from(conversationSettings)
    .where(eq(conversationSettings.convId, convId))
    .limit(1);
  const settings = settingsRows[0];
  if (!settings) return null;

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
            inArray(
              characters.id,
              charBindings.map((b) => b.characterId),
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

  const persona = settings.personaId
    ? (
        await db
          .select()
          .from(personas)
          .where(eq(personas.id, settings.personaId))
          .limit(1)
      )[0]
    : undefined;

  const preset = settings.presetId
    ? (
        await db
          .select()
          .from(samplingPresets)
          .where(eq(samplingPresets.id, settings.presetId))
          .limit(1)
      )[0]
    : undefined;

  const lbBindings = await db
    .select({ lorebookId: conversationLorebooks.lorebookId })
    .from(conversationLorebooks)
    .where(eq(conversationLorebooks.convId, convId))
    .orderBy(asc(conversationLorebooks.orderIndex));
  const lorebookIds = lbBindings.map((b) => b.lorebookId);

  const [lbRows, lbEntries] =
    lorebookIds.length > 0
      ? await Promise.all([
          db.select().from(lorebooks).where(inArray(lorebooks.id, lorebookIds)),
          db
            .select()
            .from(lorebookEntries)
            .where(
              and(
                inArray(lorebookEntries.lorebookId, lorebookIds),
                eq(lorebookEntries.enabled, true),
              ),
            ),
        ])
      : [[], []];

  return { settings, boundCharacters, persona, preset, lbRows, lbEntries };
}

type ClientBoundCharacter = {
  binding: {
    characterId: string;
    orderIndex?: number;
    isActive?: boolean;
    overrides?: unknown;
  };
  character: unknown;
};

type ClientChatContext = {
  persona?: unknown;
  // Bare rows (legacy) or `{binding, character}` (honors isActive/overrides).
  characters?: Array<unknown> | Array<ClientBoundCharacter>;
  lorebooks?: Array<{ lorebook: unknown; entries: Array<unknown> }>;
  preset?: unknown;
  settings?: unknown;
};

function isBoundCharacter(raw: unknown): raw is ClientBoundCharacter {
  if (!raw || typeof raw !== "object") return false;
  const obj = raw as Record<string, unknown>;
  return (
    obj.character != null &&
    typeof obj.binding === "object" &&
    obj.binding != null
  );
}

export function buildContextFromClient(
  ctx: ClientChatContext,
): LoadedConvContext {
  if (!ctx.settings) return null;
  const settings = ctx.settings as NonNullable<LoadedConvContext>["settings"];
  const rawChars = ctx.characters ?? [];
  type Bound = NonNullable<LoadedConvContext>["boundCharacters"][number];
  type Char = Bound["character"];
  const boundCharacters: Bound[] = [];
  rawChars.forEach((raw, i) => {
    if (isBoundCharacter(raw)) {
      if (raw.binding.isActive === false) return;
      boundCharacters.push({
        binding: {
          characterId: raw.binding.characterId,
          orderIndex: raw.binding.orderIndex ?? i,
          isActive: raw.binding.isActive ?? true,
          overrides: (raw.binding.overrides ?? null) as Bound["binding"]["overrides"],
        },
        character: raw.character as Char,
      });
      return;
    }
    const character = raw as Char;
    boundCharacters.push({
      binding: {
        characterId: character.id,
        orderIndex: i,
        isActive: true,
        overrides: null,
      },
      character,
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
