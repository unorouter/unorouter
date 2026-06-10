// Per-model role-handling flags (RisuAI LLMFlags port), keyed off the model
// name so new models pick the right behavior without per-model config. Manual
// preset flags OR with these, so a user can always force a transform on.

export type ModelRoleFlags = {
  // Model accepts a real system role anywhere (no mid-conv system stripping).
  fullSystem: boolean;
  // System messages must be hoisted to the front (informational; uno already
  // keeps the top-level `system` separate, so this is mostly a marker).
  firstSystem: boolean;
  // Adjacent same-role messages must be merged (strict user/assistant alternation).
  alternateRoles: boolean;
  // Conversation must start with a user message (inject a blank user stub).
  userStub: boolean;
  // Conversation must END with a user message (append a blank user stub when it
  // would otherwise end on assistant). GLM rejects "last role must be user".
  endUserStub: boolean;
  // Model honors an assistant prefill (trailing assistant message).
  prefillSupported: boolean;
};

const DEFAULT_FLAGS: ModelRoleFlags = {
  fullSystem: true,
  firstSystem: false,
  alternateRoles: false,
  userStub: false,
  endUserStub: false,
  prefillSupported: false,
};

type Rule = { test: RegExp; flags: Partial<ModelRoleFlags> };

// Order matters: first matching rule wins. Patterns are case-insensitive.
const RULES: Rule[] = [
  // GLM / DeepSeek / Kimi family: strict alternation, no mid-conv system,
  // must start with user, prefill ok. (Risu DeepSeek flags + GLM picky roles.)
  {
    test: /glm|chatglm|deepseek|\bkimi\b|moonshot/i,
    flags: {
      fullSystem: false,
      firstSystem: true,
      alternateRoles: true,
      userStub: true,
      endUserStub: true,
      prefillSupported: true,
    },
  },
  // Gemini: first-system + alternation, no full mid-conv system, user-first.
  {
    test: /gemini/i,
    flags: {
      fullSystem: false,
      firstSystem: true,
      alternateRoles: true,
      userStub: true,
      prefillSupported: false,
    },
  },
  // Anthropic Claude: real system, no merge/strip, user-first, prefill is a
  // first-class jailbreak surface.
  {
    test: /claude|anthropic/i,
    flags: {
      fullSystem: true,
      firstSystem: true,
      alternateRoles: false,
      userStub: true,
      prefillSupported: true,
    },
  },
  // OpenAI GPT / o-series: full system role, no role transforms needed.
  {
    test: /\bgpt|^o[1-9]|openai|chatgpt/i,
    flags: { fullSystem: true },
  },
];

export function getModelRoleFlags(modelName: string): ModelRoleFlags {
  const name = modelName ?? "";
  for (const rule of RULES) {
    if (rule.test.test(name)) {
      return { ...DEFAULT_FLAGS, ...rule.flags };
    }
  }
  return DEFAULT_FLAGS;
}
