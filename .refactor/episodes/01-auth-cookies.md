# Episode 01: Auth + cookie identity

## Intent

Upstream-driven OAuth + email/password. App-side concerns: cookie set (access_token httpOnly, signed user-id, plain local-user-id twin, client-store), redirect preservation, Turnstile, 2FA, passkeys, OAuth bind/unbind.

## Timeline (chronic churn, 5 waves)

- Mar 3-7: initial auth flow. Cookie handling rewritten 4x in one week (handleLogin -> handleAuthResponse, AUTH_COOKIES centralization, streamline x2).
- Mar 21-29: affiliate capture, OAuth callback, passkeys, settings.
- Apr 18: SESSION_SECRET signing added, user-id verification.
- Jun 1: login redirect preservation (4 commits same feature: helper extract, locale-strip fix, regex replace).
- Jun 26 - Jul 3: cookie serialize swap, oauth redirect_uri fix THEN REVERT (2b333798), then "fix(auth): resolve session/token identity conflict breaking logins" (e68843f7), upstream session cookie strip (ff6caea6).
- Jul 10: auth state server-rendered from Suspense holes, anonymous self-request skip, login link hydration fix.

## Debt markers

- Fix:feat ratio highest of all scopes that survived to today.
- Revert chain Jul 2-3 (oauth redirect_uri) = area where behavior is not fully understood; the identity-conflict fix landed same day.
- Cookie knowledge spread across: src/lib/config/constants.ts (names), src/lib/utils/server.ts (signing), src/server/constants.ts (getUserId/getApiKey), src/store/client-store.ts (CLIENT_STORE_KEY), best-key.service.ts (resolution chain), LocalUserIdSync provider (backfill). Six homes for one concept.
- Jul 10 Suspense rework is 1 day old; leftovers from the pre-Suspense pattern likely remain.

## File set (verified against tree)

- src/server/auth/ (account/, settings/, web-bot-auth/)
- src/lib/utils/server.ts, src/lib/config/constants.ts, src/server/constants.ts
- src/server/billing/token/best-key.service.ts
- src/store/client-store.ts, src/components/provider/state/local-user-id-sync.tsx
- src/app/[locale]/(auth)/, login/register forms
- src/hooks/auth/

## Cleanup scope

1. Map the actual cookie lifecycle end to end (set points, read points, clear points) and kill any pre-Suspense reads left after Jul 10 rework.
2. Consolidate cookie-name + signing + resolution docs/logic proximity (proximity refactoring: what changes together moves together).
3. Re-check the reverted oauth redirect_uri path; the underlying issue that motivated the reverted fix may still exist.

## Non-goals

- No auth flow redesign, no upstream contract changes, no touching web-bot-auth (separate, stable).
