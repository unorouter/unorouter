import type { LoadedConvContext } from "@/lib/types";

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
    NonNullable<LoadedConvContext>["persona"] | undefined;
  const preset = (ctx.preset ?? undefined) as
    NonNullable<LoadedConvContext>["preset"] | undefined;

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
