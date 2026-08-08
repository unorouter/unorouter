// Shared image-generation constants; client and server import the same values.

// Gateway billing: upstream cost times markup, floored per call. Must track the
// new-api gateway's cost-plus settings.
export const COST_MARKUP = 20;
export const COST_FLOOR_FALLBACK = 0.02;

// `<publisher>:<modelId>@<versionId>`. This value selects the model that runs, so
// nothing malformed may be forwarded upstream.
export const AIR_PATTERN = /^[a-z0-9_-]+:\d+@\d+$/i;

export function isValidAir(value: unknown): value is string {
  return typeof value === "string" && AIR_PATTERN.test(value);
}

export const IMAGE_SESSION_TITLE_MAX = 60;

// Reference-image caps: illustrator inlay refs vs refs lifted from a chat message.
export const MAX_INLAY_REFS = 6;
export const MAX_CHAT_IMAGE_REFS = 4;
