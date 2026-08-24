import { msg } from "@/lib/config/constants";
import { verifyUserId } from "@/lib/utils/server";
import { importCardByUrlBody } from "@/lib/validation/character-cards";
import { Elysia, status, t } from "elysia";
import { getImportStatus, submitImport } from "./import-card.service";

export const characterCardsRoute = new Elysia({ prefix: "/character-cards" })
  // Elysia's default error response is text/plain, which Eden Treaty does not
  // parse, so a raw undici "fetch failed" from an unreachable uno-import was the
  // entire message the user got. The service throws translation keys and they
  // only survive as keys through a JSON body the client can look up.
  .onError(({ error }) => {
    const key = error instanceof Error ? error.message : "";
    if (!key.startsWith("ERRORS."))
      return status(502, {
        error: { message: msg("ERRORS.CARD_IMPORT_FETCH_FAILED") },
      });
    // 400 blames the link, which is right for a bad URL and wrong for our own
    // import service being down; those two arrive here as the same shape.
    const ours = key === msg("ERRORS.CARD_IMPORT_UNAVAILABLE");
    return status(ours ? 502 : 400, { error: { message: key } });
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
