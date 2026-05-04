/**
 * Read SillyTavern character cards (PNG / WebP / JSON) into our character schema.
 *
 * - PNG: a `chara` tEXt chunk holding base64(JSON)
 *   spec: https://github.com/malfoyslastname/character-card-spec-v2
 * - WebP: EXIF UserComment holding the same JSON
 * - JSON: spec-v2 envelope `{ spec: "chara_card_v2", data: {...} }` or v1 flat
 */

import exifr from "exifr";
import pngText from "png-chunk-text";
import extractChunks from "png-chunks-extract";

export type ParsedCharacterCard = {
  spec: "v1" | "v2";
  name: string;
  description?: string;
  personality?: string;
  scenario?: string;
  firstMessage?: string;
  exampleMessages?: string;
  systemPrompt?: string;
  postHistoryInstructions?: string;
  tags?: string[];
  raw: Record<string, unknown>;
};

function pickStr(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key];
  return typeof v === "string" && v.trim() ? v : undefined;
}

function mapJsonToCard(
  raw: Record<string, unknown>,
): ParsedCharacterCard | null {
  if (
    raw.spec === "chara_card_v2" ||
    raw.spec === "chara_card_v3" ||
    typeof raw.data === "object"
  ) {
    const data = (raw.data ?? raw) as Record<string, unknown>;
    const name = pickStr(data, "name");
    if (!name) return null;
    return {
      spec: "v2",
      name,
      description: pickStr(data, "description"),
      personality: pickStr(data, "personality"),
      scenario: pickStr(data, "scenario"),
      firstMessage: pickStr(data, "first_mes"),
      exampleMessages: pickStr(data, "mes_example"),
      systemPrompt: pickStr(data, "system_prompt"),
      postHistoryInstructions: pickStr(data, "post_history_instructions"),
      tags: Array.isArray(data.tags)
        ? (data.tags as unknown[]).filter((x): x is string => typeof x === "string")
        : undefined,
      raw,
    };
  }

  // v1 flat
  const name = pickStr(raw, "name") ?? pickStr(raw, "char_name");
  if (!name) return null;
  return {
    spec: "v1",
    name,
    description: pickStr(raw, "description") ?? pickStr(raw, "char_persona"),
    personality: pickStr(raw, "personality"),
    scenario: pickStr(raw, "scenario") ?? pickStr(raw, "world_scenario"),
    firstMessage: pickStr(raw, "first_mes") ?? pickStr(raw, "char_greeting"),
    exampleMessages:
      pickStr(raw, "mes_example") ?? pickStr(raw, "example_dialogue"),
    systemPrompt: pickStr(raw, "system_prompt"),
    postHistoryInstructions: pickStr(raw, "post_history_instructions"),
    raw,
  };
}

function readPngChara(buffer: Buffer): string | null {
  const chunks = extractChunks(buffer);
  for (const chunk of chunks) {
    if (chunk.name !== "tEXt") continue;
    const decoded = pngText.decode(chunk.data);
    if (decoded.keyword === "chara" || decoded.keyword === "ccv3") {
      return decoded.text;
    }
  }
  return null;
}

async function readWebpChara(buffer: Buffer): Promise<string | null> {
  // exifr.parse on WebP returns parsed EXIF; UserComment is the chara payload.
  const parsed = await exifr.parse(buffer, {
    userComment: true,
    pick: ["UserComment"],
  });
  if (!parsed?.UserComment) return null;
  // exifr returns UserComment as a string when it can decode it.
  if (typeof parsed.UserComment === "string") return parsed.UserComment;
  // Fall back: it can also come back as Uint8Array; first 8 bytes are the
  // character-code header (e.g. ASCII\0\0\0 / UNICODE\0).
  const bytes = parsed.UserComment as Uint8Array;
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(8));
}

export type CharacterCardImportResult = {
  card: ParsedCharacterCard;
  /** Raw image bytes for avatar storage. Null when source was JSON. */
  imageBuffer: Buffer | null;
  imageMime: string | null;
};

export async function parseCharacterCardFile(
  file: File,
): Promise<CharacterCardImportResult> {
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = file.type;

  if (mime === "application/json" || mime === "text/json") {
    const parsed = JSON.parse(buf.toString("utf-8")) as Record<string, unknown>;
    const card = mapJsonToCard(parsed);
    if (!card) throw new Error("Character card missing required `name` field");
    return { card, imageBuffer: null, imageMime: null };
  }

  if (mime === "image/png") {
    const charaB64 = readPngChara(buf);
    if (!charaB64) {
      throw new Error("PNG has no `chara` text chunk (not a character card?)");
    }
    const json = Buffer.from(charaB64, "base64").toString("utf-8");
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const card = mapJsonToCard(parsed);
    if (!card) throw new Error("Character card missing required `name` field");
    return { card, imageBuffer: buf, imageMime: "image/png" };
  }

  if (mime === "image/webp") {
    const userComment = await readWebpChara(buf);
    if (!userComment) {
      throw new Error("WebP has no EXIF UserComment (not a character card?)");
    }
    const parsed = JSON.parse(userComment) as Record<string, unknown>;
    const card = mapJsonToCard(parsed);
    if (!card) throw new Error("Character card missing required `name` field");
    return { card, imageBuffer: buf, imageMime: "image/webp" };
  }

  throw new Error(`Unsupported character card format: ${mime}`);
}
