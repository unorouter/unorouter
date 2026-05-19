import { Elysia } from "elysia";
import { authRoute as authAccountRoute } from "./account/route";
import { settingsRoute } from "./settings/route";

export const authDomainRoute = new Elysia({ prefix: "/auth" })
  .use(authAccountRoute)
  .use(settingsRoute);
