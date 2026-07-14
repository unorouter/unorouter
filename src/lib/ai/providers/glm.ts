import { DEFAULT_ROLE_FLAGS, type ProviderAdapter } from "./types";

// GLM runs best with no system role and strictly alternating user/assistant turns; this removed the
// minor quality drift seen with a real system role + stacked same-role runs. Prefill still works: the
// endUserStub is skipped when a prefill supplies the trailing assistant turn (role-transform rule 7).
export const glmAdapter: ProviderAdapter = {
  name: "glm",
  match: (m) => /glm|chatglm|\bkimi\b|moonshot/i.test(m),
  roleFlags: {
    ...DEFAULT_ROLE_FLAGS,
    fullSystem: false,
    alternateRoles: true,
    prefillSupported: true,
  },
};
