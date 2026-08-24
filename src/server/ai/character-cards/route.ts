import { verifyUserId } from "@/lib/utils/server";
import { importCardByUrlBody } from "@/lib/validation/character-cards";
import { Elysia, t } from "elysia";
import { getImportStatus, submitImport } from "./import-card.service";

export const characterCardsRoute = new Elysia({ prefix: "/character-cards" })
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
