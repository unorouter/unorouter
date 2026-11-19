import type { Cell, Sheet } from "write-excel-file/browser";
import type { CreateDocumentInput } from "./schema";
import { sheetsOf } from "./normalize";

function cellOf(v: string | number | boolean | null): Cell {
  if (typeof v === "string" && v.startsWith("="))
    return { type: "Formula", value: v.slice(1) };
  return v;
}

export async function buildXlsx(input: CreateDocumentInput): Promise<Blob> {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const used = new Set<string>();
  const sheets: Sheet<Blob>[] = sheetsOf(input).map((s, i) => {
    // Excel refuses duplicate names and these characters in a sheet name.
    let name =
      s.name
        .replace(/[[\]:*?/\\]/g, " ")
        .trim()
        .slice(0, 31) || `Sheet${i + 1}`;
    while (used.has(name.toLowerCase())) name = `${name.slice(0, 28)} ${i + 1}`;
    used.add(name.toLowerCase());
    const header: Cell[] = (s.header ?? []).map((h) => ({
      value: h,
      fontWeight: "bold",
    }));
    return {
      sheet: name,
      stickyRowsCount: header.length > 0 ? 1 : 0,
      data: [
        ...(header.length > 0 ? [header] : []),
        ...s.rows.map((r) => r.map(cellOf)),
      ],
    };
  });
  if (sheets.length === 0) throw new Error("xlsx: no sheet data");
  return writeXlsxFile(sheets).toBlob();
}
