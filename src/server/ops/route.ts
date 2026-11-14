import { Elysia } from "elysia";
import { badgeRoute } from "./badge/route";
import { clientReportRoute } from "./client-report/route";
import { healthRoute } from "./health/route";
import { logsRoute } from "./logs/route";
import { statsRoute } from "./stats/route";

export const opsDomainRoute = new Elysia({ prefix: "/ops" })
  .use(badgeRoute)
  .use(clientReportRoute)
  .use(healthRoute)
  .use(logsRoute)
  .use(statsRoute);
