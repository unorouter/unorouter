import { TypeCompiler } from "@sinclair/typebox/compiler";
import { Type as t, type Static } from "@sinclair/typebox/type";

// Mirrors uno-import's src/types/uniform-card.ts. Its job route declares the
// result as `t.Array(t.Any())`, so the generated client carries no element type
// and each item is checked here before a hook reads it. Fields copied straight
// from a source's JSON also accept null, which the hooks already default.

const uniformEntry = t.Object({
  keys: t.Array(t.String()),
  secondaryKeys: t.Optional(t.Union([t.Array(t.String()), t.Null()])),
  content: t.String(),
  comment: t.Optional(t.Union([t.String(), t.Null()])),
  enabled: t.Boolean(),
  constant: t.Boolean(),
  selective: t.Boolean(),
  priority: t.Number(),
  orderIndex: t.Number(),
  matchWholeWords: t.Boolean(),
  injectionRole: t.Optional(
    t.Union([t.Literal("system"), t.Literal("user"), t.Literal("assistant")]),
  ),
  chance: t.Optional(t.Union([t.Number(), t.Null()])),
});

const uniformLorebook = t.Object({
  name: t.String(),
  scanDepth: t.Optional(t.Union([t.Number(), t.Null()])),
  entries: t.Array(uniformEntry),
});

const skippedLorebook = t.Object({
  title: t.String(),
  reason: t.Union([t.Literal("private"), t.Literal("not_found")]),
});

const uniformAsset = t.Object({
  name: t.String(),
  mimeType: t.String(),
  base64: t.String(),
});

const cardPayload = t.Object({
  spec: t.String(),
  spec_version: t.Optional(t.String()),
  data: t.Record(t.String(), t.Unknown()),
});

const source = { source: t.String(), sourceUrl: t.String() };

export const importedResultSchema = t.Union([
  t.Object({
    kind: t.Optional(t.Literal("character")),
    ...source,
    avatar: t.Optional(uniformAsset),
    card: cardPayload,
    lorebooks: t.Array(uniformLorebook),
    skipped: t.Array(skippedLorebook),
    plugins: t.Optional(
      t.Array(
        t.Object({
          name: t.String(),
          script: t.String(),
          kind: t.Optional(
            t.Union([t.Literal("janitor"), t.Literal("perchance")]),
          ),
        }),
      ),
    ),
    skippedScripts: t.Optional(t.Array(t.String())),
  }),
  t.Object({
    kind: t.Literal("lorebook"),
    ...source,
    lorebooks: t.Array(uniformLorebook),
    skipped: t.Array(skippedLorebook),
  }),
  t.Object({
    kind: t.Literal("persona"),
    ...source,
    personas: t.Array(
      t.Object({
        name: t.String(),
        description: t.String(),
        attributes: t.Optional(t.Record(t.String(), t.Unknown())),
      }),
    ),
  }),
  t.Object({
    kind: t.Literal("plugin"),
    ...source,
    plugin: t.Object({ name: t.String(), script: t.String() }),
  }),
  t.Object({
    kind: t.Literal("preset"),
    ...source,
    preset: t.Object({ name: t.String(), promptTemplate: t.String() }),
    lorebooks: t.Array(uniformLorebook),
  }),
  t.Object({
    kind: t.Literal("rich-character"),
    ...source,
    avatar: t.Optional(uniformAsset),
    card: cardPayload,
    lorebooks: t.Array(uniformLorebook),
    regexScripts: t.Optional(t.Unknown()),
    triggers: t.Optional(t.Unknown()),
    assets: t.Array(uniformAsset),
  }),
]);
export const importedResultChecker = TypeCompiler.Compile(importedResultSchema);
export type ImportedResult = Static<typeof importedResultSchema>;
