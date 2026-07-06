import { DEFAULT_ROLE_FLAGS, type ProviderAdapter } from "./types";

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
    deepSeekPrefix: true,
    deepSeekThinkingToggle: true,
    deepSeekThinkingInput: true,
  },
};
