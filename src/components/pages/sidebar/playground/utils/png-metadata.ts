// ComfyUI stores the API workflow JSON under the `prompt` keyword and the
// editor graph under `workflow`; AUTOMATIC1111 / Forge / SwarmUI store
// theirs under `parameters`. Compressed `zTXt` and international `iTXt`
// chunks are not handled; ComfyUI uses plain `tEXt`.

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10] as const;

function bytesEqual(a: Uint8Array, b: readonly number[], offset = 0): boolean {
  for (let i = 0; i < b.length; i++) {
    if (a[offset + i] !== b[i]) return false;
  }
  return true;
}

function readUint32BE(view: DataView, offset: number): number {
  return view.getUint32(offset, false);
}

export function readPngTextChunks(
  buffer: ArrayBuffer,
): Record<string, string> | null {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 8 || !bytesEqual(bytes, PNG_SIGNATURE)) return null;

  const view = new DataView(buffer);
  const decoder = new TextDecoder("latin1");
  const out: Record<string, string> = {};

  // chunks: length(4) | type(4) | data | crc(4), after 8-byte signature
  let cursor = 8;
  while (cursor + 8 <= bytes.length) {
    const dataLength = readUint32BE(view, cursor);
    const typeBytes = bytes.slice(cursor + 4, cursor + 8);
    const type = decoder.decode(typeBytes);
    const dataStart = cursor + 8;
    const dataEnd = dataStart + dataLength;
    if (dataEnd + 4 > bytes.length) break;

    if (type === "tEXt") {
      const data = bytes.slice(dataStart, dataEnd);
      // tEXt format: keyword (Latin-1, null-terminated, 1-79 chars) +
      // text (Latin-1). Search for the null separator.
      const nullIdx = data.indexOf(0);
      if (nullIdx > 0) {
        const keyword = decoder.decode(data.slice(0, nullIdx));
        const text = decoder.decode(data.slice(nullIdx + 1));
        out[keyword] = text;
      }
    }

    if (type === "IEND") break;

    cursor = dataEnd + 4;
  }

  return out;
}

// Best-effort: any field we can't pin down stays undefined and the form
// keeps its default.
export type RestoredFromPng = {
  prompt?: string;
  negativePrompt?: string;
  seed?: number;
  steps?: number;
  cfg?: number;
  guidance?: number;
  sampler?: string;
  scheduler?: string;
  width?: number;
  height?: number;
};

type ComfyNode = {
  class_type?: string;
  inputs?: Record<string, unknown>;
};

type ComfyGraph = Record<string, ComfyNode>;

function asNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

// First CLIPTextEncode in source order is treated as positive, second as
// negative; the graph doesn't tag them.
export function extractFromComfyGraph(graph: unknown): RestoredFromPng {
  if (!graph || typeof graph !== "object") return {};
  const g = graph as ComfyGraph;
  const out: RestoredFromPng = {};
  const textEncodes: string[] = [];

  for (const node of Object.values(g)) {
    if (!node || typeof node !== "object") continue;
    const cls = node.class_type;
    const inputs = node.inputs ?? {};

    if (cls === "CLIPTextEncode") {
      const text = asString(inputs.text);
      if (text) textEncodes.push(text);
    } else if (cls === "KSampler") {
      out.seed ??= asNumber(inputs.seed);
      out.steps ??= asNumber(inputs.steps);
      out.cfg ??= asNumber(inputs.cfg);
      out.sampler ??= asString(inputs.sampler_name);
      out.scheduler ??= asString(inputs.scheduler);
    } else if (cls === "RandomNoise") {
      // Flux 2 graphs use RandomNoise instead of KSampler for the seed.
      out.seed ??= asNumber(inputs.noise_seed);
    } else if (cls === "FluxGuidance") {
      out.guidance ??= asNumber(inputs.guidance);
    } else if (cls === "Flux2Scheduler") {
      out.steps ??= asNumber(inputs.steps);
      out.width ??= asNumber(inputs.width);
      out.height ??= asNumber(inputs.height);
    } else if (cls === "EmptyLatentImage" || cls === "EmptyFlux2LatentImage") {
      out.width ??= asNumber(inputs.width);
      out.height ??= asNumber(inputs.height);
    } else if (cls === "KSamplerSelect") {
      out.sampler ??= asString(inputs.sampler_name);
    }
  }

  if (textEncodes.length > 0) out.prompt = textEncodes[0];
  if (textEncodes.length > 1) out.negativePrompt = textEncodes[1];

  return out;
}

export async function extractMetadataFromPngFile(
  file: File,
): Promise<RestoredFromPng | null> {
  const buffer = await file.arrayBuffer();
  const chunks = readPngTextChunks(buffer);
  if (!chunks) return null;

  // Prefer the API graph (`prompt`) over the editor graph (`workflow`);
  // the editor graph uses different field names that we don't target.
  const promptChunk = chunks.prompt ?? chunks.workflow;
  if (!promptChunk) return null;

  let graph: unknown;
  try {
    graph = JSON.parse(promptChunk);
  } catch {
    return null;
  }
  return extractFromComfyGraph(graph);
}
