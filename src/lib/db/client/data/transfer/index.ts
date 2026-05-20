"use client";

import {
  msg,
  NATIVE_VERSION,
  ORPG_VERSION,
} from "@/lib/config/constants";
import type { NativeImport, OrpgImport } from "@/lib/types/transfer";
import type { ConversationExportFormat } from "@/lib/validation/rp";
import { buildNativeExport, importNative, importOrpg, toOrpg } from "./native";
import {
  exportLocalConversationSillyTavern,
  importSillyTavernChat,
  looksLikeSillyTavernChat,
} from "./sillytavern";
export { exportLocalConversationSillyTavern, looksLikeSillyTavernChat };

export async function exportLocalConversation(
  userId: number | undefined,
  convId: string,
  format: ConversationExportFormat,
) {
  const native = await buildNativeExport(userId, convId);
  return format === "orpg" ? toOrpg(native) : native;
}

export async function importLocalConversation(
  userId: number | undefined,
  file: File,
): Promise<{ id: string }> {
  const text = await file.text();

  // ST JSONL is line-delimited; detect before JSON.parse.
  if (looksLikeSillyTavernChat(text)) {
    return importSillyTavernChat(userId, text);
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(msg("ERRORS.IMPORT_INVALID_JSON"));
  }

  // Single boundary cast: parsed JSON is untrusted, the typed envelope shapes
  // make every field optional so downstream access stays sound.
  if (parsed.version === NATIVE_VERSION) {
    return importNative(userId, parsed as unknown as NativeImport);
  }
  if (parsed.version === ORPG_VERSION) {
    return importOrpg(userId, parsed as unknown as OrpgImport);
  }
  throw new Error(msg("ERRORS.IMPORT_UNSUPPORTED_VERSION"));
}
