import { DEFAULT_ROLE_FLAGS, type ProviderAdapter } from "./types";

export const glmAdapter: ProviderAdapter = {
  name: "glm",
  match: (m) => /glm|chatglm|\bkimi\b|moonshot/i.test(m),
  roleFlags: {
    ...DEFAULT_ROLE_FLAGS,
    fullSystem: false,
    firstSystem: true,
    alternateRoles: true,
    userStub: true,
    endUserStub: true,
    prefillSupported: true,
  },
};
