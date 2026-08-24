import { msg } from "@/lib/config/constants";
import { verifyUserId } from "@/lib/utils/server";
import { importCardByUrlBody } from "@/lib/validation/character-cards";
import { Elysia, status, t } from "elysia";
import { getImportStatus, submitImport } from "./import-card.service";

export const characterCardsRoute = new Elysia({ prefix: "/character-cards" })
  .onError(({ error }) => {
    const key = error instanceof Error ? error.message : "";
    if (!key.startsWith("ERRORS."))
      return status(502, {
        error: { message: msg("ERRORS.CARD_IMPORT_FETCH_FAILED") },
      });

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
