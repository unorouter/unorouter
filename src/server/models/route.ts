import { Elysia } from "elysia";
import { modelStatusRoute } from "./model-status/route";
import { modelTesterRoute } from "./model-tester/route";
import { perfMetricsRoute } from "./perf-metrics/route";
import { pricingRoute } from "./pricing/route";
import { rankingsRoute } from "./rankings/route";
import { verifyRoute } from "./verify/route";

export const modelsDomainRoute = new Elysia({ prefix: "/models" })
  .use(pricingRoute)
  .use(perfMetricsRoute)
  .use(modelStatusRoute)
  .use(rankingsRoute)
  .use(verifyRoute)
  .use(modelTesterRoute);
