import { DEFAULT_ROLE_FLAGS, type ProviderAdapter } from "./types";

// Opus 5: adaptive thinking + xhigh effort. Before the 4.x/5 adapter.
export const claudeOpus5Adapter: ProviderAdapter = {
  name: "claude-opus-5",
  match: (m) => /claude-opus-5/i.test(m),
  roleFlags: {
    ...DEFAULT_ROLE_FLAGS,
    firstSystem: true,
    userStub: true,
    prefillSupported: true,
    claudeAdaptiveThinking: true,
    claudeXHighEffort: true,
    cacheControl: true,
  },
};

// 4.x/5 family: adaptive thinking, effort capped at high.
export const claude45Adapter: ProviderAdapter = {
  name: "claude-4-5",
  match: (m) => /claude-(opus|sonnet|haiku)-[45]/i.test(m),
  roleFlags: {
    ...DEFAULT_ROLE_FLAGS,
    firstSystem: true,
    userStub: true,
    prefillSupported: true,
    claudeAdaptiveThinking: true,
    cacheControl: true,
  },
};

// Older Claude: real system, user-first, prefill.
export const claudeLegacyAdapter: ProviderAdapter = {
  name: "claude-legacy",
  match: (m) => /claude|anthropic/i.test(m),
  roleFlags: {
    ...DEFAULT_ROLE_FLAGS,
    firstSystem: true,
    userStub: true,
    prefillSupported: true,
    cacheControl: true,
  },
};
