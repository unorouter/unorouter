import { importCardByUrlBody } from "@/lib/validation/character-cards";
import { verifyUserId } from "@/lib/utils/server";
import { Elysia, t } from "elysia";
import { getImportStatus, submitImport } from "./import-card.service";

// Submit and poll rather than one blocking call: a fetch runs a real browser and
// can rotate its VPN exit mid-job, so holding the request open turns a slow
// import into a browser timeout with no way to report progress.
export const characterCardsRoute = new Elysia({ prefix: "/character-cards" })
  .post(
    "/import",
    async ({ body, cookie }) => {
      // From the signed cookie, never the request body: uno-import rate limits
      // per user id, so a caller-supplied one is no limit at all. Guests share
      // the "0" bucket by design.
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
