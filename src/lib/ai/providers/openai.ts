import { DEFAULT_ROLE_FLAGS, type ProviderAdapter } from "./types";

// GPT / o-series: full system, no transforms. Upstream new-api handles the developer/token renames.
export const openaiAdapter: ProviderAdapter = {
  name: "openai",
  match: (m) => /\bgpt|^o[1-9]|openai|chatgpt/i.test(m),
  roleFlags: { ...DEFAULT_ROLE_FLAGS },
};
