// Distilled form of a Runware per-model OpenAPI schema
// (https://runware.ai/docs/models/<slug>/schema.json, public, no auth). Runware is the
// authority on what a model accepts: a param absent here is rejected upstream, so a
// control for it could only ever produce a failed generation.
//
// The raw schema is 24-65KB per model; this keeps the ~1.5KB that decides which controls
// render and within which bounds. Pure and isomorphic (no fetch), so the build script and
// the client cache share one implementation.

import { rec } from "@/lib/utils/base";

export type ParamSpec = {
  type?: string;
  min?: number;
  max?: number;
  default?: unknown;
  enum?: string[];
};

export type ModelParamSpec = {
  air: string | null;
  capabilities: string[];
  params: Record<string, ParamSpec>;
  // Vendor-scoped parameters, keyed "<vendor>.<field>".
  providerSettings: Record<string, ParamSpec>;
  // inputs.referenceImages.maxItems. Distinct from seedImage/maskImage: a model can take
  // an init image for img2img yet accept no reference images at all (flux-1-dev).
  maxReferenceImages: number;
  supportsSeedImage: boolean;
  supportsMaskImage: boolean;
};

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject | null {
  return rec(value) ?? null;
}

// RequestBody comes in TWO shapes: most models put params on `properties`, others
// (flux-2-flex) wrap the task in an array and nest them under `items.properties`.
// Reading only `properties` reports every param of those models as missing.
function requestProperties(schema: JsonObject): JsonObject {
  const direct = asObject(schema.properties);
  if (direct) return direct;
  const items = asObject(schema.items);
  return (items && asObject(items.properties)) ?? {};
}

function toParamSpec(raw: JsonObject): ParamSpec {
  const spec: ParamSpec = {};
  if (typeof raw.type === "string") spec.type = raw.type;
  if (typeof raw.minimum === "number") spec.min = raw.minimum;
  if (typeof raw.maximum === "number") spec.max = raw.maximum;
  if (raw.default !== undefined) spec.default = raw.default;
  if (Array.isArray(raw.enum)) {
    spec.enum = raw.enum.filter((v): v is string => typeof v === "string");
  } else if (Array.isArray(raw.oneOf)) {
    // Runware spells provider-settings enums as oneOf[{const}] rather than enum.
    const consts = raw.oneOf
      .map((o) => asObject(o)?.const)
      .filter((c): c is string => typeof c === "string");
    if (consts.length > 0) spec.enum = consts;
  }
  return spec;
}

export function distillSchema(raw: unknown): ModelParamSpec | null {
  const root = asObject(raw);
  if (!root) return null;
  const components = asObject(root.components);
  const schemas = components && asObject(components.schemas);
  const requestBody = schemas && asObject(schemas.RequestBody);
  if (!requestBody) return null;

  const properties = requestProperties(requestBody);
  const params: Record<string, ParamSpec> = {};
  for (const [key, value] of Object.entries(properties)) {
    const entry = asObject(value);
    if (entry) params[key] = toParamSpec(entry);
  }

  const inputs = asObject(properties.inputs);
  const inputProps = (inputs && asObject(inputs.properties)) ?? {};
  const references = asObject(inputProps.referenceImages);
  const maxReferenceImages =
    references && typeof references.maxItems === "number"
      ? references.maxItems
      : 0;

  // providerSettings nests one object per vendor (openai.quality, bfl.safetyTolerance).
  // Flattened to "<vendor>.<field>" so a caller reads one map instead of walking two
  // levels for a value that is still just a parameter.
  const providerSettings: Record<string, ParamSpec> = {};
  const settingsRoot = asObject(properties.providerSettings);
  for (const [vendor, vendorSchema] of Object.entries(
    (settingsRoot && asObject(settingsRoot.properties)) ?? {},
  )) {
    const vendorProps = asObject(vendorSchema);
    for (const [field, fieldSchema] of Object.entries(
      (vendorProps && asObject(vendorProps.properties)) ?? {},
    )) {
      const entry = asObject(fieldSchema);
      if (entry) providerSettings[`${vendor}.${field}`] = toParamSpec(entry);
    }
  }

  const info = asObject(root.info) ?? {};
  const capabilities = Array.isArray(info["x-capabilities"])
    ? info["x-capabilities"].filter((c): c is string => typeof c === "string")
    : [];

  return {
    air: typeof info["x-air-id"] === "string" ? info["x-air-id"] : null,
    capabilities,
    params,
    maxReferenceImages,
    providerSettings,
    supportsSeedImage: "seedImage" in inputProps,
    supportsMaskImage: "maskImage" in inputProps,
  };
}

export type RunwareSchemaSnapshot = {
  byAir: Record<string, ModelParamSpec>;
  byArchitecture: Record<string, ModelParamSpec>;
};
