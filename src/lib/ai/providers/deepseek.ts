import { DEFAULT_ROLE_FLAGS, type ProviderAdapter } from "./types";

// deepseek emits NO reasoning after a plain trailing assistant prefill; a prefill-opened
// `<think>` restores it. GLM does not need this.
export const deepseekAdapter: ProviderAdapter = {
  name: "deepseek",
  match: (m) => /deepseek/i.test(m),
  roleFlags: {
    ...DEFAULT_ROLE_FLAGS,
    fullSystem: false,
    firstSystem: true,
    alternateRoles: true,
    userStub: true,
    endUserStub: true,
    prefillSupported: true,
    prefillOpensThink: true,
    deepSeekPrefix: true,
    deepSeekThinkingToggle: true,
    deepSeekThinkingInput: true,
  },
};
