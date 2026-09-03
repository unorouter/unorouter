import {
  samplingPresetBody,
  type SamplingPresetBody,
} from "@/lib/validation/rp";
import { rec } from "@/lib/utils/base";
import { Value } from "@sinclair/typebox/value";

// Accepts our own .preset.json export and anything shaped like it. Keys the
// file leaves out become null where the schema allows it, so a hand-trimmed
// file still imports; isDefault never survives an import.
export function parsePresetJson(raw: unknown): SamplingPresetBody | null {
  const data = rec(raw);
  if (!data) return null;
  const candidate: Record<string, unknown> = { ...data };
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
