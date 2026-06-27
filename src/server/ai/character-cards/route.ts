import { importCardByUrlBody } from "@/lib/validation/character-cards";
import { Elysia } from "elysia";
import { importCardFromUrl } from "./import-card.service";

export const characterCardsRoute = new Elysia({
  prefix: "/character-cards",
}).post(
  "/import",
  async ({ body }) => {
    return { success: true, data: await importCardFromUrl(body.url) };
  },
  { body: importCardByUrlBody },
);
