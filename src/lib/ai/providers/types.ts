export type ModelRoleFlags = {
  fullSystem: boolean;
  firstSystem: boolean;
  alternateRoles: boolean;
  userStub: boolean;
  endUserStub: boolean;
  prefillSupported: boolean;
  prefillOpensThink: boolean;
  deepSeekPrefix: boolean;
  deepSeekThinkingToggle: boolean;
  deepSeekThinkingInput: boolean;
  claudeAdaptiveThinking: boolean;
  claudeXHighEffort: boolean;
  noCivilIntegrity: boolean;
  cacheControl: boolean;
};

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
  prefillOpensThink: false,
  deepSeekPrefix: false,
  deepSeekThinkingToggle: false,
  deepSeekThinkingInput: false,
  claudeAdaptiveThinking: false,
  claudeXHighEffort: false,
  noCivilIntegrity: false,
  cacheControl: false,
};
