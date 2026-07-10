import { DEFAULT_ROLE_FLAGS, type ProviderAdapter } from "./types";

// GLM accepts stacked same-role messages and a real system role (user-verified against the live API
// with consecutive user/assistant runs). The old auto alternateRoles/userStub/endUserStub defaults
// also blocked trailing-assistant prefills. Alternation is opt-in via the preset's manual flags now.
export const glmAdapter: ProviderAdapter = {
  name: "glm",
  match: (m) => /glm|chatglm|\bkimi\b|moonshot/i.test(m),
  roleFlags: {
    ...DEFAULT_ROLE_FLAGS,
    prefillSupported: true,
  },
};
