import { Elysia } from "elysia";
import { affiliateRoute } from "./affiliate/route";
import { checkoutSessionsRoute } from "./checkout-sessions/route";
import { billingRoute as billingCoreRoute } from "./core/route";
import { dashboardRoute } from "./dashboard/route";
import { tokenRoute } from "./token/route";

export const billingDomainRoute = new Elysia({ prefix: "/billing" })
  .use(billingCoreRoute)
  .use(checkoutSessionsRoute)
  .use(affiliateRoute)
  .use(dashboardRoute)
  .use(tokenRoute);
