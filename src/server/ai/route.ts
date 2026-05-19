import { Elysia } from "elysia";
import { chatRoute } from "./chat/route";
import { rpRoute } from "./chat/rp/route";
import { playgroundRoute } from "./playground/route";
import { syncRoute } from "./sync/route";

export const aiDomainRoute = new Elysia({ prefix: "/ai" })
  .use(chatRoute)
  .use(rpRoute)
  .use(playgroundRoute)
  .use(syncRoute);
