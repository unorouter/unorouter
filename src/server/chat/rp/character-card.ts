/**
 * Read SillyTavern character cards (PNG / WebP / JSON) into our character schema.
 *
 * - PNG: a `chara` tEXt chunk holding base64(JSON)
 *   spec: https://github.com/malfoyslastname/character-card-spec-v2
 * - WebP: EXIF UserComment holding the same JSON
 * - JSON: spec-v2 envelope `{ spec: "chara_card_v2", data: {...} }` or v1 flat
 */

import pngText from "png-chunk-text";
import extractChunks from "png-chunks-extract";
import sharp from "sharp";

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

const EXIF_TAG_USER_COMMENT = 0x9286;
const EXIF_TAG_EXIF_IFD_POINTER = 0x8769;

function readUserCommentFromTiff(tiff: Buffer): string | null {
  if (tiff.length < 8) return null;

  const byteOrder = tiff.readUInt16BE(0);
  const little = byteOrder === 0x4949;
  const big = byteOrder === 0x4d4d;
  if (!little && !big) return null;

  const u16 = (off: number) =>
    little ? tiff.readUInt16LE(off) : tiff.readUInt16BE(off);
  const u32 = (off: number) =>
    little ? tiff.readUInt32LE(off) : tiff.readUInt32BE(off);

  if (u16(2) !== 0x002a) return null;

  const findTag = (ifdOffset: number, tag: number): number | null => {
    if (ifdOffset + 2 > tiff.length) return null;
    const count = u16(ifdOffset);
    for (let i = 0; i < count; i++) {
      const entry = ifdOffset + 2 + i * 12;
      if (entry + 12 > tiff.length) return null;
      if (u16(entry) === tag) return entry;
    }
    return null;
  };

  const ifd0Offset = u32(4);
  const exifPointerEntry = findTag(ifd0Offset, EXIF_TAG_EXIF_IFD_POINTER);
  if (!exifPointerEntry) return null;
  const exifIfdOffset = u32(exifPointerEntry + 8);

  const userCommentEntry = findTag(exifIfdOffset, EXIF_TAG_USER_COMMENT);
  if (!userCommentEntry) return null;

  const length = u32(userCommentEntry + 4);
  const valueOffset =
    length <= 4 ? userCommentEntry + 8 : u32(userCommentEntry + 8);
  if (valueOffset + length > tiff.length) return null;

  // First 8 bytes are the character-code header (ASCII\0\0\0, UNICODE\0, JIS\0\0\0\0\0, or 8 zero bytes for undefined).
  if (length <= 8) return null;
  const payload = tiff.subarray(valueOffset + 8, valueOffset + length);
  return new TextDecoder("utf-8", { fatal: false }).decode(payload);
}

async function readWebpChara(buffer: Buffer): Promise<string | null> {
  const meta = await sharp(buffer).metadata();
  if (!meta.exif) return null;
  return readUserCommentFromTiff(meta.exif);
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
