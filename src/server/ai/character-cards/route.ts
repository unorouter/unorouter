import { msg } from "@/lib/config/constants";
import { verifyUserId } from "@/lib/utils/server";
import { importCardByUrlBody } from "@/lib/validation/character-cards";
import { Elysia, t } from "elysia";
import { getImportStatus, submitImport } from "./import-card.service";

export const characterCardsRoute = new Elysia({ prefix: "/character-cards" })
  // Elysia's default error response is text/plain, which Eden Treaty does not
  // parse, so a raw undici "fetch failed" from an unreachable uno-import was the
  // entire message the user got. The service throws translation keys and they
  // only survive as keys through a JSON body the client can look up.
  .onError(({ error }): undefined => {
    const key = error instanceof Error ? error.message : "";
    const known = key.startsWith("ERRORS.");
    return new Response(
      JSON.stringify({
        error: {
          message: known ? key : msg("ERRORS.CARD_IMPORT_FETCH_FAILED"),
        },
      }),
      {
        status: known ? 400 : 502,
        headers: { "content-type": "application/json" },
      },
    ) as never;
  })
  .post(
    "/import",
    async ({ body, cookie }) => {
      const sealed = cookie["user-id"]?.value;
      const uid = await verifyUserId(
        typeof sealed === "string" ? sealed : undefined,
      );
      return {
        success: true,
        data: await submitImport(body.url, String(uid ?? 0)),
      };
    },
    { body: importCardByUrlBody },
  )
  .get(
    "/import/:jobId",
    async ({ params }) => {
      return { success: true, data: await getImportStatus(params.jobId) };
    },
    { params: t.Object({ jobId: t.String({ maxLength: 64 }) }) },
  );
