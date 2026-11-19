"use client";

import { Type as t, type Static } from "@sinclair/typebox/type";
import { Value } from "@sinclair/typebox/value";
import { upsertLocalMedia } from "@/lib/db/client/data/media/media";
import { uid } from "@/lib/utils/base";
import type { ChatTool } from "../registry";
import { packagesFor } from "./manifest";
import { runPython } from "./runtime";

const runPythonInput = t.Object({
  code: t.String({ minLength: 1, maxLength: 100_000 }),
  timeout_s: t.Optional(t.Integer({ minimum: 1, maximum: 180 })),
});
type RunPythonInput = Static<typeof runPythonInput>;

// Anything else downloads as a generic binary.
const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  csv: "text/csv",
  txt: "text/plain",
  md: "text/markdown",
  json: "application/json",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_FILES = 20;

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

const cleanName = (name: string) =>
  name
    .split("/")
    .pop()
    ?.replace(/[\u0000-\u001f\\:*?"<>|]+/g, "-")
    .slice(0, 128) || "file";

export const runPythonTool: ChatTool = {
  name: "run_python",
  titleKey: "CHAT.TOOLS.RUN_PYTHON",
  hintKey: "CHAT.TOOLS.RUN_PYTHON_HINT",
  description: [
    "Run Python 3 in a sandbox in the user's browser. No internet and no pip.",
    "Available: the standard library, numpy, pandas, matplotlib, pillow, lxml, python-docx (import docx), python-pptx (import pptx), openpyxl, xlsxwriter, fpdf2 (from fpdf import FPDF).",
    "The working directory is /work/output: save files there with relative paths and the user gets a download card for each; open matplotlib figures are saved as PNG automatically.",
    "Use print() to see values; the value of the last expression is also returned.",
    "Only mention files listed in the result's files; never paste base64 or links.",
    "Variables persist between calls in the same chat but can reset; on NameError recreate them.",
  ].join(" "),
  input: runPythonInput,
  signedIn: false,
  execute: async (input, ctx) => {
    if (!Value.Check(runPythonInput, input))
      throw new Error(
        "Invalid input: expected { code: string, timeout_s?: integer }",
      );
    const args: RunPythonInput = input;
    const run = await runPython(
      ctx.convId,
      args.code,
      packagesFor(args.code),
      (args.timeout_s ?? 60) * 1000,
      ctx.abortSignal,
    );
    if (!run.ok)
      return {
        ok: false,
        stdout: run.stdout,
        stderr: run.stderr,
        error: run.error,
      };
    const files = [];
    const notes: string[] = [];
    for (const f of run.files.slice(0, MAX_FILES)) {
      if (f.bytes.byteLength > MAX_FILE_BYTES) {
        notes.push(`${f.name} is over 25 MB and was not saved`);
        continue;
      }
      const filename = cleanName(f.name);
      const ext = filename.split(".").pop()?.toLowerCase() ?? "";
      const fileId = uid();
      await upsertLocalMedia({
        id: fileId,
        convId: ctx.convId,
        mimeType: MIME[ext] ?? "application/octet-stream",
        sizeBytes: f.bytes.byteLength,
        dataBase64: toBase64(f.bytes),
      });
      files.push({ fileId, filename, sizeBytes: f.bytes.byteLength });
    }
    if (run.files.length > MAX_FILES)
      notes.push(`only the first ${MAX_FILES} files were saved`);
    return {
      ok: true,
      stdout: run.stdout,
      stderr: run.stderr,
      result: run.result,
      files,
      ...(notes.length > 0 ? { notes } : {}),
    };
  },
};
