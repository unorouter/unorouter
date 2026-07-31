import { Elysia } from "elysia";
import { characterCardsRoute } from "./character-cards/route";
import { chatRoute } from "./chat/route";
import { imageRoute } from "./image/route";

export const aiDomainRoute = new Elysia({ prefix: "/ai" })
  .use(chatRoute)
  .use(characterCardsRoute)
  .use(imageRoute);
