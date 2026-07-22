import { Elysia } from "elysia";
import { characterCardsRoute } from "./character-cards/route";
import { chatRoute } from "./chat/route";

export const aiDomainRoute = new Elysia({ prefix: "/ai" })
  .use(chatRoute)
  .use(characterCardsRoute);
