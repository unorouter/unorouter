import { termsAcceptBody } from "@/lib/api/typebox/auth";
import { unwrap } from "@/lib/utils/base";
import { acceptTerms, getTermsAcceptance } from "@/openapi";
import { deriveUpstream } from "@/server/constants";
import { Elysia } from "elysia";

// Account only: guests accept nothing, and API keys never reach this check.
export const termsAcceptanceRoute = new Elysia({ prefix: "/terms-acceptance" })
  .derive(deriveUpstream)

  .get("/", async ({ upstream }) => unwrap(await getTermsAcceptance(upstream)))

  .post(
    "/",
    async ({ body, upstream }) => unwrap(await acceptTerms(body, upstream)),
    { body: termsAcceptBody },
  );
