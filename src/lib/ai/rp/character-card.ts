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

type ParsedCharacterCard = {
  spec: "v2" | "v3";
  name: string;
  description?: string;
  personality?: string;
  scenario?: string;
  firstMessage?: string;
  alternateGreetings?: string[];
  exampleMessages?: string;
  systemPrompt?: string;
  postHistoryInstructions?: string;
  tags?: string[];
  raw: Record<string, unknown>;
};

type CharacterCardImportResult = {
  card: ParsedCharacterCard;
  imageBytes: Uint8Array | null;
  imageMime: string | null;
};

const NON_EMPTY = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v : undefined;

const EXT_TO_MIME: Record<string, string> = {
  webp: "image/webp",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
};

const MIME_TO_EXT: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpeg",
  "image/png": "png",
};

export async function parseCharacterCardFile(
  file: File,
): Promise<CharacterCardImportResult> {
  const mime = file.type;
  const bytes = new Uint8Array(await file.arrayBuffer());

  let parsed;
  try {
    parsed = parseCard(bytes);
  } catch {
    throw new Error(msg("ERRORS.CARD_PARSE_FAILED"));
  }

  const data = parsed.card.data;
  if (!data?.name) {
    throw new Error(msg("ERRORS.CARD_MISSING_NAME"));
  }

  const card: ParsedCharacterCard = {
    spec: parsed.spec === "v3" ? "v3" : "v2",
    name: data.name,
    description: NON_EMPTY(data.description),
    personality: NON_EMPTY(data.personality),
    scenario: NON_EMPTY(data.scenario),
    firstMessage: NON_EMPTY(data.first_mes),
    alternateGreetings: Array.isArray(data.alternate_greetings)
      ? data.alternate_greetings.filter(
          (g): g is string => typeof g === "string" && g.trim() !== "",
        )
      : undefined,
    exampleMessages: NON_EMPTY(data.mes_example),
    systemPrompt: NON_EMPTY(data.system_prompt),
    postHistoryInstructions: NON_EMPTY(data.post_history_instructions),
    tags: Array.isArray(data.tags)
      ? data.tags.filter((t): t is string => typeof t === "string")
      : undefined,
    raw: parsed.card as unknown as Record<string, unknown>,
  };

  const iconAsset =
    parsed.assets.find((a) => a.type === "icon") ?? parsed.assets[0];
  let imageBytes: Uint8Array | null = null;
  let imageMime: string | null = null;
  if (iconAsset?.data) {
    imageBytes = new Uint8Array(iconAsset.data);
    imageMime = EXT_TO_MIME[iconAsset.ext ?? ""] ?? "image/png";
  } else if (mime === "image/png" || mime === "image/webp") {
    imageBytes = bytes;
    imageMime = mime;
  }

  return { card, imageBytes, imageMime };
}

type ExportableRow = {
  name: string;
  description: string | null;
  personality: string | null;
  scenario: string | null;
  firstMessage: string | null;
  alternateGreetings: string[] | null;
  exampleMessages: string | null;
  systemPrompt: string | null;
  postHistoryInstructions: string | null;
  tags: string[] | null;
};

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
    alternateGreetings: row.alternateGreetings ?? [],
    groupOnlyGreetings: [],
    tags: row.tags ?? [],
    extensions: {},
  };
  return denormalizeToV3(normalized);
}

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

export function exportCharacterCard(
  row: ExportableRow,
  avatar: { data: Uint8Array; mime: string } | null,
  format: ExportFormat,
): { data: Uint8Array; mimeType: string; ext: string } {
  const card = buildCCv3Card(row);

  const assets: ExportAsset[] = [];
  if (avatar) {
    assets.push({
      name: "main",
      type: "icon",
      ext: MIME_TO_EXT[avatar.mime] ?? "png",
      data: avatar.data,
    });
  }

  if (format === "png" && assets.length === 0) {
    assets.push({
      name: "main",
      type: "icon",
      ext: "png",
      data: ONE_PIXEL_PNG,
    });
  }

  const result = exportCard(card, assets, { format });

  const OVERRIDES: Partial<
    Record<ExportFormat, { ext: string; mimeType: string }>
  > = {
    png: { ext: "png", mimeType: "image/png" },
    voxta: { ext: "voxpkg", mimeType: "application/octet-stream" },
  };
  const meta = OVERRIDES[format] ?? {
    ext: format,
    mimeType: "application/zip",
  };
  return { data: result.buffer, mimeType: meta.mimeType, ext: meta.ext };
}

const ONE_PIXEL_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06,
  0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44,
  0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d,
  0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42,
  0x60, 0x82,
]);
