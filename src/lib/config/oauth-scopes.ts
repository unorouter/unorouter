import type { TranslationKey } from "@/lib/config/constants";
import type { IconName } from "@/lib/config/icon-map";

export const OAUTH_SCOPES = [
  "models:read",
  "balance:read",
  "tokens:read",
  "tokens:write",
  "subscription:read",
  "subscription:cancel",
  "checkout:create",
] as const;

type OAuthScope = (typeof OAUTH_SCOPES)[number];

export const OAUTH_SCOPE_TRANSLATION_KEYS: Record<
  OAuthScope | "openid",
  TranslationKey
> = {
  "models:read": "AUTH.CONSENT.SCOPE.MODELS_READ",
  "balance:read": "AUTH.CONSENT.SCOPE.BALANCE_READ",
  "tokens:read": "AUTH.CONSENT.SCOPE.TOKENS_READ",
  "tokens:write": "AUTH.CONSENT.SCOPE.TOKENS_WRITE",
  "subscription:read": "AUTH.CONSENT.SCOPE.SUBSCRIPTION_READ",
  "subscription:cancel": "AUTH.CONSENT.SCOPE.SUBSCRIPTION_CANCEL",
  "checkout:create": "AUTH.CONSENT.SCOPE.CHECKOUT_CREATE",
  openid: "AUTH.CONSENT.SCOPE.OPENID",
};

type KnownScope = OAuthScope | "openid";

const isKnownScope = (v: string): v is KnownScope =>
  v in OAUTH_SCOPE_TRANSLATION_KEYS;

export function getScopeTranslationKey(
  scope: string,
): TranslationKey | undefined {
  return isKnownScope(scope) ? OAUTH_SCOPE_TRANSLATION_KEYS[scope] : undefined;
}

export type ScopeKind = "read" | "write" | "danger";

type ScopeMeta = {
  icon: IconName;
  kind: ScopeKind;
};

const SCOPE_META: Record<OAuthScope | "openid", ScopeMeta> = {
  openid: { icon: "shield-check", kind: "read" },
  "models:read": { icon: "eye", kind: "read" },
  "balance:read": { icon: "eye", kind: "read" },
  "tokens:read": { icon: "eye", kind: "read" },
  "tokens:write": { icon: "key-round", kind: "write" },
  "subscription:read": { icon: "eye", kind: "read" },
  "subscription:cancel": { icon: "octagon-x", kind: "danger" },
  "checkout:create": { icon: "shopping-cart", kind: "write" },
};

const DEFAULT_SCOPE_META: ScopeMeta = {
  icon: "shield-check",
  kind: "read",
};

export function getScopeMeta(scope: string): ScopeMeta {
  return isKnownScope(scope) ? SCOPE_META[scope] : DEFAULT_SCOPE_META;
}
