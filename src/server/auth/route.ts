import { Elysia } from "elysia";
import { authRoute as authAccountRoute } from "./account/route";
import { ownPurposeObjectionRoute } from "./own-purpose-objection/route";
import { providerConsentRoute } from "./provider-consent/route";
import { settingsRoute } from "./settings/route";
import { termsAcceptanceRoute } from "./terms-acceptance/route";

export const authDomainRoute = new Elysia({ prefix: "/auth" })
  .use(authAccountRoute)
  .use(settingsRoute)
  .use(ownPurposeObjectionRoute)
  .use(providerConsentRoute)
  .use(termsAcceptanceRoute);
