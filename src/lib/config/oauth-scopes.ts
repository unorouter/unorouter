import type { TranslationKey } from "@/lib/config/constants";
import type { IconName } from "@/lib/config/icon-map";

// Must mirror new-api/setting/oauth_scopes.go (Go side enforces). `openid` is
// goidc's internal seed scope; intentionally omitted here.
export const OAUTH_SCOPES = [
  "models:read",
  "balance:read",
  "tokens:read",
  "tokens:write",
  "subscription:read",
  "subscription:cancel",
  "checkout:create",
] as const;

export type OAuthScope = (typeof OAUTH_SCOPES)[number];

// `openid` tolerated even though not advertised: upstream auth request may
// include it for OIDC compliance.
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

export function getScopeTranslationKey(
  scope: string,
): TranslationKey | undefined {
  return Object.hasOwn(OAUTH_SCOPE_TRANSLATION_KEYS, scope)
    ? OAUTH_SCOPE_TRANSLATION_KEYS[
        scope as keyof typeof OAUTH_SCOPE_TRANSLATION_KEYS
      ]
    : undefined;
}

export type ScopeKind = "read" | "write" | "danger";

export type ScopeMeta = {
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
  return Object.hasOwn(SCOPE_META, scope)
    ? SCOPE_META[scope as keyof typeof SCOPE_META]
    : DEFAULT_SCOPE_META;
}
