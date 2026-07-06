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

function readPngTextChunks(buffer: ArrayBuffer): Record<string, string> | null {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 8 || !bytesEqual(bytes, PNG_SIGNATURE)) return null;

  const view = new DataView(buffer);
  const decoder = new TextDecoder("latin1");
  const out: Record<string, string> = {};

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

function extractFromComfyGraph(graph: unknown): RestoredFromPng {
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
