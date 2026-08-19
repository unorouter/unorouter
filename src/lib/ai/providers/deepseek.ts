import { DEFAULT_ROLE_FLAGS, type ProviderAdapter } from "./types";

// A plain trailing assistant prefill makes deepseek continue that turn directly and emit NO
// reasoning at all, so the gateway's thinking_to_content has nothing to wrap and the reply
// arrives as one bare text block: the chain of thought reads as prose pasted above the answer.
// Opening a `<think>` in the prefill puts it back inside its reasoning block (measured: plain
// prefill 0 think tags, `<think>`-opened 1). GLM does not need this - it keeps reasoning in the
// native field whether or not a prefill is present.
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
