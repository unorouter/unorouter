/**
 * Character card parsing and emission via @character-foundry/character-foundry.
 *
 * Supports CCv2/CCv3 PNG/JSON, CharX (RisuAI ZIP), JPEG+ZIP hybrids, and
 * Voxta `.voxpkg` multi-character packages on read; PNG (CCv3 with backfilled
 * V2 chunk for legacy readers), CharX, and Voxta on write.
 */

import { msg } from "@/lib/config/constants";
import { parseCard } from "@character-foundry/character-foundry/loader";
import {
  exportCard,
  type ExportAsset,
  type ExportFormat,
} from "@character-foundry/character-foundry/exporter";
import {
  denormalizeToV3,
  type NormalizedCard,
} from "@character-foundry/character-foundry/normalizer";

export type ParsedCharacterCard = {
  spec: "v2" | "v3";
  name: string;
  description?: string;
  personality?: string;
  scenario?: string;
  firstMessage?: string;
  exampleMessages?: string;
  systemPrompt?: string;
  postHistoryInstructions?: string;
  tags?: string[];
  /** Raw data preserved for round-trip. */
  raw: Record<string, unknown>;
};

export type CharacterCardImportResult = {
  card: ParsedCharacterCard;
  /** First image asset (icon/avatar). Null when source was JSON or had none. */
  imageBuffer: Buffer | null;
  imageMime: string | null;
};

const NON_EMPTY = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v : undefined;

/**
 * Parse a character card file (PNG/WebP/JPEG/CharX/Voxta/JSON) into our
 * flat ParsedCharacterCard shape. The library normalizes V1/V2/V3 → CCv3
 * internally; we read the (already normalized) inner `data` block.
 */
export async function parseCharacterCardFile(
  file: File,
): Promise<CharacterCardImportResult> {
  const mime = file.type;
  const buf = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = parseCard(new Uint8Array(buf));
  } catch {
    throw new Error(msg("ERRORS.CARD_PARSE_FAILED"));
  }

  const data = parsed.card.data;
  if (!data?.name) {
    throw new Error(msg("ERRORS.CARD_MISSING_NAME"));
  }

  // Map the library's CCv3 inner data to our flat shape. The library
  // normalizes V1 → V2 internally and reports `spec: "v2" | "v3"`.
  const card: ParsedCharacterCard = {
    spec: parsed.spec === "v3" ? "v3" : "v2",
    name: data.name,
    description: NON_EMPTY(data.description),
    personality: NON_EMPTY(data.personality),
    scenario: NON_EMPTY(data.scenario),
    firstMessage: NON_EMPTY(data.first_mes),
    exampleMessages: NON_EMPTY(data.mes_example),
    systemPrompt: NON_EMPTY(data.system_prompt),
    postHistoryInstructions: NON_EMPTY(data.post_history_instructions),
    tags: Array.isArray(data.tags)
      ? data.tags.filter((t): t is string => typeof t === "string")
      : undefined,
    raw: parsed.card as unknown as Record<string, unknown>,
  };

  // Pick the first icon asset for the avatar; fall back to the original file
  // bytes for PNG containers (the original IS the avatar).
  const iconAsset =
    parsed.assets.find((a) => a.type === "icon") ?? parsed.assets[0];
  let imageBuffer: Buffer | null = null;
  let imageMime: string | null = null;
  if (iconAsset?.data) {
    imageBuffer = Buffer.from(iconAsset.data);
    imageMime =
      iconAsset.ext === "webp"
        ? "image/webp"
        : iconAsset.ext === "jpeg" || iconAsset.ext === "jpg"
          ? "image/jpeg"
          : "image/png";
  } else if (mime === "image/png" || mime === "image/webp") {
    // CCv3 PNG: when no icon asset is extracted, the file itself is the avatar.
    imageBuffer = buf;
    imageMime = mime;
  }

  return { card, imageBuffer, imageMime };
}

type ExportableRow = {
  name: string;
  description: string | null;
  personality: string | null;
  scenario: string | null;
  firstMessage: string | null;
  exampleMessages: string | null;
  systemPrompt: string | null;
  postHistoryInstructions: string | null;
  tags: unknown;
};

/** Build the canonical CCv3 envelope from a DB row via the foundry normalizer. */
function buildCCv3Card(row: ExportableRow) {
  const normalized: NormalizedCard = {
    name: row.name,
    description: row.description ?? "",
    personality: row.personality ?? "",
    scenario: row.scenario ?? "",
    firstMes: row.firstMessage ?? "",
    mesExample: row.exampleMessages ?? "",
    systemPrompt: row.systemPrompt ?? undefined,
    postHistoryInstructions: row.postHistoryInstructions ?? undefined,
    alternateGreetings: [],
    groupOnlyGreetings: [],
    tags: Array.isArray(row.tags)
      ? (row.tags as unknown[]).filter(
          (t): t is string => typeof t === "string",
        )
      : [],
    extensions: {},
  };
  return denormalizeToV3(normalized);
}

/**
 * Build a JSON-stringified CCv3 envelope. The foundry library doesn't ship a
 * JSON exporter (only PNG/CharX/Voxta containers); this returns the same
 * envelope shape its parser accepts on read so round-trip via parseCard()
 * works.
 */
export function exportCharacterCardAsJson(row: ExportableRow): {
  data: Uint8Array;
  mimeType: string;
  ext: string;
} {
  const card = buildCCv3Card(row);
  return {
    data: new TextEncoder().encode(JSON.stringify({ ...card }, null, 2)),
    mimeType: "application/json",
    ext: "json",
  };
}

/**
 * Re-emit a character row + avatar bytes as a PNG/CharX/Voxta blob.
 *
 * @param row Our DB row shape (flat fields from `characters` table).
 * @param avatar Optional avatar bytes; embedded as the icon asset on PNG.
 * @param format Target container.
 */
export function exportCharacterCard(
  row: ExportableRow,
  avatar: { data: Buffer; mime: string } | null,
  format: ExportFormat,
): { data: Uint8Array; mimeType: string; ext: string } {
  const card = buildCCv3Card(row);

  const assets: ExportAsset[] = [];
  if (avatar) {
    assets.push({
      name: "main",
      type: "icon",
      ext:
        avatar.mime === "image/webp"
          ? "webp"
          : avatar.mime === "image/jpeg"
            ? "jpeg"
            : "png",
      data: new Uint8Array(avatar.data),
    });
  }

  // The library validates that PNG export has a PNG icon asset. Fall back
  // to a 1×1 transparent PNG when none is provided so the call never throws.
  if (format === "png" && assets.length === 0) {
    assets.push({
      name: "main",
      type: "icon",
      ext: "png",
      data: ONE_PIXEL_PNG,
    });
  }

  const result = exportCard(card, assets, { format });

  const ext = format === "voxta" ? "voxpkg" : format;
  const mimeType =
    format === "png"
      ? "image/png"
      : format === "voxta"
        ? "application/octet-stream"
        : "application/zip";
  return { data: result.buffer, mimeType, ext };
}

// 1x1 transparent PNG, base64-decoded, used as the empty-avatar fallback.
const ONE_PIXEL_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06,
  0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44,
  0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d,
  0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42,
  0x60, 0x82,
]);
