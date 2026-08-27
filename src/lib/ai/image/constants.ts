// Must track the new-api gateway's cost-plus settings or estimates misprice.
export const COST_MARKUP = 20;
export const COST_FLOOR_FALLBACK = 0.02;

// `<publisher>:<modelId>@<versionId>`
export const AIR_PATTERN = /^[a-z0-9_-]+:\d+@\d+$/i;

export function isValidAir(value: unknown): value is string {
  return typeof value === "string" && AIR_PATTERN.test(value);
}

export const IMAGE_SESSION_TITLE_MAX = 60;

export const MAX_INLAY_REFS = 6;
