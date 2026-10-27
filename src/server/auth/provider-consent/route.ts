import {
  providerConsentGrantBody,
  providerConsentListQuery,
  providerConsentRevokeBody,
} from "@/lib/api/typebox/consent";
import { unwrap } from "@/lib/utils/base";
import {
  grantGuestProviderConsents,
  grantProviderConsents,
  revokeGuestProviderConsent,
  revokeProviderConsent,
} from "@/openapi";
import { deriveUpstream, getUserId } from "@/server/constants";
import { Elysia } from "elysia";
import {
  ensureGuestId,
  forgetGuestConsents,
  guestConsentHeaders,
  readGuestId,
} from "../guest-consent.service";
import {
  fetchGuestProviderConsents,
  fetchProviderConsents,
} from "./provider-consent.service";

// The account when logged in, otherwise the browser's guest id.
export const providerConsentRoute = new Elysia({
  prefix: "/provider-consents",
})
  .derive(deriveUpstream)

  .get(
    "/",
    async ({ cookie, query, upstream }) => {
      if ((await getUserId(cookie, true)) !== null)
        return unwrap(
          await fetchProviderConsents(upstream.headers, query.model),
        );
      const guestId = ensureGuestId(cookie);
      return unwrap(
        await fetchGuestProviderConsents(
          guestConsentHeaders(guestId),
          query.model,
        ),
      );
    },
    { query: providerConsentListQuery },
  )

  .post(
    "/",
    async ({ body, cookie, upstream }) => {
      if ((await getUserId(cookie, true)) !== null)
        return unwrap(
          await grantProviderConsents(body, { headers: upstream.headers }),
        );
      const guestId = ensureGuestId(cookie);
      forgetGuestConsents(guestId);
      return unwrap(
        await grantGuestProviderConsents(body, {
          headers: guestConsentHeaders(guestId),
        }),
      );
    },
    { body: providerConsentGrantBody },
  )

  .delete(
    "/",
    async ({ body, cookie, upstream }) => {
      if ((await getUserId(cookie, true)) !== null)
        return unwrap(
          await revokeProviderConsent(body, { headers: upstream.headers }),
        );
      const guestId = readGuestId(cookie);
      if (!guestId) return { success: true, message: "ok" };
      forgetGuestConsents(guestId);
      return unwrap(
        await revokeGuestProviderConsent(body, {
          headers: guestConsentHeaders(guestId),
        }),
      );
    },
    { body: providerConsentRevokeBody },
  );
