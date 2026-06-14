    // Per-model role-handling flags (RisuAI LLMFlags port), keyed off the model name. Manual preset flags OR with these.

type ModelRoleFlags = {
  // Model accepts a real system role anywhere (no mid-conv system stripping).
  fullSystem: boolean;
      // System messages hoisted to the front; mostly a marker since uno keeps top-level system separate.
  firstSystem: boolean;
  // Adjacent same-role messages must be merged (strict user/assistant alternation).
  alternateRoles: boolean;
  // Conversation must start with a user message (inject a blank user stub).
  userStub: boolean;
      // Conversation must END with a user message (append a blank user stub otherwise). GLM rejects "last role must be user".
  endUserStub: boolean;
  // Model honors an assistant prefill (trailing assistant message).
  prefillSupported: boolean;
  // DeepSeek prefix-completion API: trailing assistant gets `prefix: true`.
  deepSeekPrefix: boolean;
      // DeepSeek thinking toggle: body.thinking {type, reasoning_effort}; enabled mode rejects sampling params.
  deepSeekThinkingToggle: boolean;
      // DeepSeek wants the last assistant turn's reasoning echoed back as reasoning_content (continuation quality).
  deepSeekThinkingInput: boolean;
  // Claude adaptive thinking (body.thinking type=adaptive + output_config.effort).
  claudeAdaptiveThinking: boolean;
  // Model accepts output_config.effort 'xhigh'.
  claudeXHighEffort: boolean;
  // Gemini variant that rejects the CIVIC_INTEGRITY safety category.
  noCivilIntegrity: boolean;
      // Anthropic prompt caching (cache_control markers); single source for the stream service's injector gate.
  cacheControl: boolean;
};

const DEFAULT_FLAGS: ModelRoleFlags = {
  fullSystem: true,
  firstSystem: false,
  alternateRoles: false,
  userStub: false,
  endUserStub: false,
  prefillSupported: false,
  deepSeekPrefix: false,
  deepSeekThinkingToggle: false,
  deepSeekThinkingInput: false,
  claudeAdaptiveThinking: false,
  claudeXHighEffort: false,
  noCivilIntegrity: false,
  cacheControl: false,
};

type Rule = { test: RegExp; flags: Partial<ModelRoleFlags> };

// Order matters: first matching rule wins. Patterns are case-insensitive.
const RULES: Rule[] = [
      // DeepSeek: GLM-style strict roles PLUS prefix-completion + thinking API. Before the GLM rule: first match wins.
  {
    test: /deepseek/i,
    flags: {
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
  },
      // GLM / Kimi family: strict alternation, no mid-conv system, must start with user, prefill ok.
  {
    test: /glm|chatglm|\bkimi\b|moonshot/i,
    flags: {
      fullSystem: false,
      firstSystem: true,
      alternateRoles: true,
      userStub: true,
      endUserStub: true,
      prefillSupported: true,
    },
  },
      // Gemini thinking-exp rejects the CIVIC_INTEGRITY safety category. Must precede the generic gemini rule.
  {
    test: /gemini-2[.-]?\d*-flash-thinking/i,
    flags: {
      fullSystem: false,
      firstSystem: true,
      alternateRoles: true,
      userStub: true,
      prefillSupported: false,
      noCivilIntegrity: true,
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
  // Claude opus 5: adaptive thinking + xhigh effort (Risu claudeXHighEffort).
  {
    test: /claude-opus-5/i,
    flags: {
      fullSystem: true,
      firstSystem: true,
      alternateRoles: false,
      userStub: true,
      prefillSupported: true,
      claudeAdaptiveThinking: true,
      claudeXHighEffort: true,
      cacheControl: true,
    },
  },
  // Claude 4.x/5 family: adaptive thinking, effort capped at high.
  {
    test: /claude-(opus|sonnet|haiku)-[45]/i,
    flags: {
      fullSystem: true,
      firstSystem: true,
      alternateRoles: false,
      userStub: true,
      prefillSupported: true,
      claudeAdaptiveThinking: true,
      cacheControl: true,
    },
  },
      // Anthropic Claude (older): real system, no merge/strip, user-first, prefill is a first-class jailbreak surface.
  {
    test: /claude|anthropic/i,
    flags: {
      fullSystem: true,
      firstSystem: true,
      alternateRoles: false,
      userStub: true,
      prefillSupported: true,
      cacheControl: true,
    },
  },
      // OpenAI GPT / o-series: full system role, no transforms. Upstream new-api handles the Developer/completion-token renames; do not re-map here.
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
