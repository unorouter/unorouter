import {
  samplingPresetBody,
  type SamplingPresetBody,
} from "@/lib/validation/rp";
import { rec } from "@/lib/utils/base";
import {
  isRisuPreset,
  isSillyTavernPreset,
  mapRisuPreset,
  mapSillyTavernPreset,
} from "./foreign-preset";
import { Value } from "@sinclair/typebox/value";

// Accepts our own .preset.json export and anything shaped like it, plus the
// SillyTavern and RisuAI exports, which carry the same settings under their own
// names and carry no name of their own. Keys the file leaves out become null
// where the schema allows it, so a hand-trimmed file still imports; isDefault
// never survives an import.
export function parsePresetJson(
  raw: unknown,
  fallbackName = "Imported preset",
): SamplingPresetBody | null {
  const data = rec(raw);
  if (!data) return null;
  const foreign = mapForeign(data, fallbackName);
  const candidate: Record<string, unknown> = foreign ?? { ...data };
  for (const [key, prop] of Object.entries(samplingPresetBody.properties)) {
    if (!(key in candidate) && Value.Check(prop, null)) candidate[key] = null;
  }
  const cleaned = Value.Clean(
    samplingPresetBody,
    Value.Default(samplingPresetBody, candidate),
  );
  if (!Value.Check(samplingPresetBody, cleaned)) return null;
  return { ...cleaned, isDefault: false };
}

// Ours already validates; a foreign file has to be translated first, and a
// partial translation is still worth importing, so an unmapped field is simply
// left for the schema to default.
function mapForeign(
  data: Record<string, unknown>,
  fallbackName: string,
): Record<string, unknown> | null {
  const mapped = isSillyTavernPreset(data)
    ? mapSillyTavernPreset(data, fallbackName)
    : isRisuPreset(data)
      ? mapRisuPreset(data, fallbackName)
      : null;
  if (!mapped) return null;
  const out: Record<string, unknown> = {
    name: mapped.name,
    promptTemplate: mapped.promptTemplate,
  };
  for (const [key, value] of Object.entries(mapped.fields)) {
    if (value !== null) out[key] = value;
  }
  return out;
}
