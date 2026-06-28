// Provider adapter layer. One module per provider family, each owning its model-name match + role flags.
// Replaces the name-regex RULES table in pipeline/role-flags.ts: new provider = new module + register it.

// RisuAI LLMFlags. Preset manual flags OR with these (a manual flag is never turned off). Read off the
// resolved adapter by the assemble-prompt / role-transform / build-body stages.
export type ModelRoleFlags = {
  fullSystem: boolean;
  firstSystem: boolean;
  alternateRoles: boolean;
  userStub: boolean;
  endUserStub: boolean;
  prefillSupported: boolean;
  deepSeekPrefix: boolean;
  deepSeekThinkingToggle: boolean;
  deepSeekThinkingInput: boolean;
  claudeAdaptiveThinking: boolean;
  claudeXHighEffort: boolean;
  noCivilIntegrity: boolean;
  cacheControl: boolean;
};

// First registered match wins (mirrors the old RULES first-match-wins order).
export type ProviderAdapter = {
  name: string;
  match: (modelName: string) => boolean;
  roleFlags: ModelRoleFlags;
};

export const DEFAULT_ROLE_FLAGS: ModelRoleFlags = {
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
