"use client";

import { Value } from "@sinclair/typebox/value";
import { upsertLocalMedia } from "@/lib/db/client/data/media/media";
import { uid } from "@/lib/utils/base";
import { createDocumentInput, type CreateDocumentInput } from "./schema";
import type { ChatTool } from "../registry";

const MIME = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const;

const MAX_BYTES = 15 * 1024 * 1024;

async function build(input: CreateDocumentInput) {
  if (input.format === "docx")
    return {
      blob: await (await import("./build-docx")).buildDocx(input),
      warnings: [],
    };
  if (input.format === "pptx")
    return {
      blob: await (await import("./build-pptx")).buildPptx(input),
      warnings: [],
    };
  if (input.format === "xlsx")
    return {
      blob: await (await import("./build-xlsx")).buildXlsx(input),
      warnings: [],
    };
  return (await import("./build-pdf")).buildPdf(input);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export type CreateDocumentResult = {
  fileId: string;
  filename: string;
  format: CreateDocumentInput["format"];
  sizeBytes: number;
  warnings: string[];
};

export const createDocumentTool: ChatTool = {
  name: "create_document",
  titleKey: "CHAT.TOOLS.CREATE_DOCUMENT",
  hintKey: "CHAT.TOOLS.CREATE_DOCUMENT_HINT",
  description: [
    "Create a downloadable file: Word (docx), PDF, PowerPoint (pptx) or Excel (xlsx). The user gets a download card; never paste the file contents or a link yourself.",
    "docx and pdf: fill `blocks` (heading, paragraph, list, table, page_break). Wrap words in **double asterisks** for bold.",
    "pptx: fill `slides`, one idea per slide, at most 6 short bullets each; put details in `notes`. Use `title` for a cover slide.",
    "xlsx: fill `sheets` with `header` and `rows`; a cell string starting with = is a formula (for example =SUM(B2:B10)). Prefer formulas over computed numbers.",
    "PDF supports Latin script only; use docx for other scripts.",
  ].join(" "),
  input: createDocumentInput,
  signedIn: false,
  execute: async (input, ctx) => {
    if (!Value.Check(createDocumentInput, input)) {
      const first = [...Value.Errors(createDocumentInput, input)][0];
      throw new Error(
        `Invalid input${first ? ` at ${first.path}: ${first.message}` : ""}`,
      );
    }
    const built = await build(input);
    if (built.blob.size > MAX_BYTES)
      throw new Error("File is larger than 15 MB");
    const ext = input.format;
    const base =
      input.filename
        .replace(/\.[a-z0-9]+$/i, "")
        .replace(/[\\/:*?"<>|]+/g, "-")
        .trim() || "document";
    const fileId = uid();
    await upsertLocalMedia({
      id: fileId,
      convId: ctx.convId,
      mimeType: MIME[ext],
      sizeBytes: built.blob.size,
      dataBase64: await blobToBase64(built.blob),
    });
    const result: CreateDocumentResult = {
      fileId,
      filename: `${base}.${ext}`,
      format: ext,
      sizeBytes: built.blob.size,
      warnings: built.warnings,
    };
    return result;
  },
};
