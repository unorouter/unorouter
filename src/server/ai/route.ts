import { Elysia } from "elysia";
import { chatRoute } from "./chat/route";
import { playgroundRoute } from "./playground/route";
import { syncRoute } from "./sync/route";

export const aiDomainRoute = new Elysia({ prefix: "/ai" })
  .use(chatRoute)
  .use(playgroundRoute)
  .use(syncRoute);
