import type { CreateDocumentInput } from "./schema";
import { blocksOf, plain } from "./normalize";

const MARGIN = 50;
// jsPDF's built-in fonts carry Latin glyphs only; anything else prints as
// garbage, so the model is told to use docx for other scripts.
const NON_LATIN = /[^\u0000-ɏḀ-ỿ -⁯₠-⃏]/;

export async function buildPdf(
  input: CreateDocumentInput,
): Promise<{ blob: Blob; warnings: string[] }> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageH = doc.internal.pageSize.getHeight();
  const width = doc.internal.pageSize.getWidth() - MARGIN * 2;
  let y = MARGIN;
  const warnings: string[] = [];

  const write = (s: string, size: number, bold: boolean, indent = 0) => {
    const text = plain(s);
    if (NON_LATIN.test(text) && warnings.length === 0)
      warnings.push(
        "PDF fonts only cover Latin script; non-Latin text will not render. Use format docx for other scripts.",
      );
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lineH = size * 1.35;
    const lines: string[] = doc.splitTextToSize(text, width - indent);
    for (const line of lines) {
      if (y + lineH > pageH - MARGIN) {
        doc.addPage();
        y = MARGIN;
      }
      doc.text(line, MARGIN + indent, y + size);
      y += lineH;
    }
  };

  if (input.title) {
    write(input.title, 24, true);
    y += 10;
  }
  for (const b of blocksOf(input)) {
    if (b.type === "heading") {
      const size = [20, 16, 13][(b.level ?? 1) - 1];
      // A heading alone at the foot of a page reads as a broken layout.
      if (y + size * 4 > pageH - MARGIN) {
        doc.addPage();
        y = MARGIN;
      }
      y += 6;
      write(b.text, size, true);
      y += 4;
    } else if (b.type === "paragraph") {
      write(b.text, 11, false);
      y += 6;
    } else if (b.type === "list") {
      b.items.forEach((item, i) =>
        write(`${b.ordered ? `${i + 1}.` : "•"} ${item}`, 11, false, 14),
      );
      y += 6;
    } else if (b.type === "table") {
      autoTable(doc, {
        head: b.header.length > 0 ? [b.header.map(plain)] : undefined,
        body: b.rows.map((r) => r.map(plain)),
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        styles: { fontSize: 9 },
        didDrawPage: (data) => {
          if (data.cursor) y = data.cursor.y;
        },
      });
      y += 12;
    } else {
      doc.addPage();
      y = MARGIN;
    }
  }
  return { blob: doc.output("blob"), warnings };
}
