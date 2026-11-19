import type {
  CreateDocumentInput,
  DocBlock,
  DocSheet,
  DocSlide,
} from "./schema";

// Weaker models fill the field for the wrong format, so each builder gets its
// content from whichever field was filled.
export function blocksOf(input: CreateDocumentInput): DocBlock[] {
  if (input.blocks?.length) return input.blocks;
  const fromSlides = (input.slides ?? []).flatMap((s): DocBlock[] => [
    ...(s.title ? [{ type: "heading" as const, text: s.title, level: 2 }] : []),
    ...(s.subtitle ? [{ type: "paragraph" as const, text: s.subtitle }] : []),
    ...(s.bullets?.length ? [{ type: "list" as const, items: s.bullets }] : []),
  ]);
  if (fromSlides.length) return fromSlides;
  return (input.sheets ?? []).flatMap((s): DocBlock[] => [
    { type: "heading", text: s.name, level: 2 },
    {
      type: "table",
      header: s.header ?? [],
      rows: s.rows.map((r) => r.map((c) => (c == null ? "" : String(c)))),
    },
  ]);
}

export function slidesOf(input: CreateDocumentInput): DocSlide[] {
  if (input.slides?.length) return input.slides;
  const slides: DocSlide[] = [];
  for (const b of blocksOf(input)) {
    const last = slides.at(-1);
    if (b.type === "heading") slides.push({ title: b.text, bullets: [] });
    else if (b.type === "paragraph" || b.type === "list") {
      const items = b.type === "list" ? b.items : [b.text];
      if (last) last.bullets = [...(last.bullets ?? []), ...items];
      else slides.push({ bullets: items });
    } else if (b.type === "table") {
      const rows = [b.header, ...b.rows].map((r) => r.join("  |  "));
      slides.push({ bullets: rows });
    }
  }
  return slides;
}

export function sheetsOf(input: CreateDocumentInput): DocSheet[] {
  if (input.sheets?.length) return input.sheets;
  let n = 0;
  return blocksOf(input).flatMap((b): DocSheet[] =>
    b.type === "table"
      ? [{ name: `Sheet${++n}`, header: b.header, rows: b.rows }]
      : [],
  );
}

// Strips the **bold** markers the model writes out of habit, for formats
// that render plain text.
export const plain = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1");

export function boldRuns(s: string): { text: string; bold: boolean }[] {
  return s
    .split(/(\*\*.+?\*\*)/g)
    .filter((part) => part.length > 0)
    .map((part) =>
      part.startsWith("**") && part.endsWith("**") && part.length > 4
        ? { text: part.slice(2, -2), bold: true }
        : { text: part, bold: false },
    );
}
