import type { CreateDocumentInput } from "./schema";
import { blocksOf, boldRuns } from "./normalize";

export async function buildDocx(input: CreateDocumentInput): Promise<Blob> {
  const {
    Document,
    HeadingLevel,
    Packer,
    PageBreak,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
  } = await import("docx");
  const runs = (s: string, bold = false) =>
    boldRuns(s).map((r) => new TextRun({ text: r.text, bold: bold || r.bold }));
  const headings = [
    HeadingLevel.HEADING_1,
    HeadingLevel.HEADING_2,
    HeadingLevel.HEADING_3,
  ];
  const children: Array<
    InstanceType<typeof Paragraph> | InstanceType<typeof Table>
  > = [];
  if (input.title)
    children.push(
      new Paragraph({
        heading: HeadingLevel.TITLE,
        children: runs(input.title),
      }),
    );
  for (const b of blocksOf(input)) {
    if (b.type === "heading")
      children.push(
        new Paragraph({
          heading: headings[(b.level ?? 1) - 1],
          children: runs(b.text),
        }),
      );
    else if (b.type === "paragraph")
      children.push(new Paragraph({ children: runs(b.text) }));
    else if (b.type === "list")
      for (const item of b.items)
        children.push(
          new Paragraph({
            children: runs(item),
            ...(b.ordered
              ? { numbering: { reference: "ordered", level: 0 } }
              : { bullet: { level: 0 } }),
          }),
        );
    else if (b.type === "table") {
      const rows = [b.header, ...b.rows].filter((r) => r.length > 0);
      if (rows.length === 0) continue;
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: rows.map(
            (r, i) =>
              new TableRow({
                tableHeader: i === 0 && b.header.length > 0,
                children: r.map(
                  (c) =>
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: runs(c, i === 0 && b.header.length > 0),
                        }),
                      ],
                    }),
                ),
              }),
          ),
        }),
      );
    } else children.push(new Paragraph({ children: [new PageBreak()] }));
  }
  const doc = new Document({
    title: input.title ?? input.filename,
    numbering: {
      config: [
        {
          reference: "ordered",
          levels: [
            { level: 0, format: "decimal", text: "%1.", alignment: "left" },
          ],
        },
      ],
    },
    sections: [{ children }],
  });
  return Packer.toBlob(doc);
}
