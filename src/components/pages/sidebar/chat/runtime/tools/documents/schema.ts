import { Type as t, type Static } from "@sinclair/typebox/type";

const text = t.String({ maxLength: 20_000 });

const block = t.Union([
  t.Object({
    type: t.Literal("heading"),
    text,
    level: t.Optional(t.Integer({ minimum: 1, maximum: 3 })),
  }),
  t.Object({ type: t.Literal("paragraph"), text }),
  t.Object({
    type: t.Literal("list"),
    items: t.Array(text, { maxItems: 200 }),
    ordered: t.Optional(t.Boolean()),
  }),
  t.Object({
    type: t.Literal("table"),
    header: t.Array(t.String({ maxLength: 500 }), { maxItems: 30 }),
    rows: t.Array(t.Array(t.String({ maxLength: 2000 }), { maxItems: 30 }), {
      maxItems: 1000,
    }),
  }),
  t.Object({ type: t.Literal("page_break") }),
]);
export type DocBlock = Static<typeof block>;

const slide = t.Object({
  title: t.Optional(t.String({ maxLength: 300 })),
  subtitle: t.Optional(t.String({ maxLength: 500 })),
  bullets: t.Optional(t.Array(t.String({ maxLength: 1000 }), { maxItems: 40 })),
  notes: t.Optional(t.String({ maxLength: 5000 })),
});
export type DocSlide = Static<typeof slide>;

// A string starting with "=" is a formula.
const cell = t.Union([
  t.String({ maxLength: 5000 }),
  t.Number(),
  t.Boolean(),
  t.Null(),
]);
const sheet = t.Object({
  name: t.String({ maxLength: 31 }),
  header: t.Optional(t.Array(t.String({ maxLength: 200 }), { maxItems: 100 })),
  rows: t.Array(t.Array(cell, { maxItems: 100 }), { maxItems: 5000 }),
});
export type DocSheet = Static<typeof sheet>;

export const createDocumentInput = t.Object({
  format: t.Union([
    t.Literal("docx"),
    t.Literal("pdf"),
    t.Literal("pptx"),
    t.Literal("xlsx"),
  ]),
  filename: t.String({ minLength: 1, maxLength: 80 }),
  title: t.Optional(t.String({ maxLength: 300 })),
  blocks: t.Optional(t.Array(block, { maxItems: 500 })),
  slides: t.Optional(t.Array(slide, { maxItems: 80 })),
  sheets: t.Optional(t.Array(sheet, { maxItems: 20 })),
});
export type CreateDocumentInput = Static<typeof createDocumentInput>;
