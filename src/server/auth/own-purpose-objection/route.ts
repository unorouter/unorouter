import { ownPurposeObjectionBody } from "@/lib/api/typebox/consent";
import { unwrap } from "@/lib/utils/base";
import {
  getGuestOwnPurposeObjection,
  getOwnPurposeObjection,
  setGuestOwnPurposeObjection,
  setOwnPurposeObjection,
} from "@/openapi";
import {
  ensureGuestId,
  forgetGuestObjection,
  guestConsentHeaders,
  readGuestId,
} from "@/server/auth/guest-consent.service";
import { deriveUpstream, getUserId } from "@/server/constants";
import { Elysia } from "elysia";

// Same split as the consents: the account's objection, else the guest id's.
export const ownPurposeObjectionRoute = new Elysia({
  prefix: "/own-purpose-objection",
})
  .derive(deriveUpstream)

  .get("/", async ({ cookie, upstream }) => {
    if ((await getUserId(cookie, true)) !== null)
      return unwrap(
        await getOwnPurposeObjection({ headers: upstream.headers }),
      );
    const guestId = readGuestId(cookie);
    if (!guestId)
      return { success: true, message: "", data: { objection: false } };
    return unwrap(
      await getGuestOwnPurposeObjection({
        headers: guestConsentHeaders(guestId),
      }),
    );
  })

  .put(
    "/",
    async ({ body, cookie, upstream }) => {
      if ((await getUserId(cookie, true)) !== null)
        return unwrap(
          await setOwnPurposeObjection(body, { headers: upstream.headers }),
        );
      const guestId = ensureGuestId(cookie);
      forgetGuestObjection(guestId);
      return unwrap(
        await setGuestOwnPurposeObjection(body, {
          headers: guestConsentHeaders(guestId),
        }),
      );
    },
    { body: ownPurposeObjectionBody },
  );
