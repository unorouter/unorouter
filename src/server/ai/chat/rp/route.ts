import { Elysia } from "elysia";
import {
  characterExportQuery,
  lorebookExportQuery,
} from "@/lib/validation/rp";
import { getUserId } from "@/server/constants";
import { exportCharacter } from "./character.service";
import { exportLorebook } from "./lorebook.service";
import { exportPreset } from "./preset.service";
import { exportCard } from "./card.service";

export const rpRoute = new Elysia({ prefix: "/rp" })
  .get(
    "/characters/:id/export",
    async ({ params, query, cookie, set }) => {
      const userId = await getUserId(cookie);
      const format = query.format ?? "png";
      const result = await exportCharacter(userId, params.id, format);
      set.headers["content-type"] = result.mimeType;
      set.headers["content-disposition"] =
        `attachment; filename="character-${params.id}.${result.ext}"`;
      const ab = new ArrayBuffer(result.data.byteLength);
      new Uint8Array(ab).set(result.data);
      return new Response(new Blob([ab], { type: result.mimeType }), {
        headers: { "content-type": result.mimeType },
      });
    },
    { query: characterExportQuery },
  )

  .get(
    "/lorebooks/:id/export",
    async ({ params, query, cookie, set }) => {
      const userId = await getUserId(cookie);
      const format = query.format ?? "sillytavern";
      const result = await exportLorebook(userId, params.id, format);
      set.headers["content-type"] = "application/json";
      set.headers["content-disposition"] =
        `attachment; filename="${result.filename}"`;
      return new Response(result.data, {
        headers: { "content-type": "application/json" },
      });
    },
    { query: lorebookExportQuery },
  )

  .get("/presets/:id/export", async ({ params, cookie, set }) => {
    const userId = await getUserId(cookie);
    const result = await exportPreset(userId, params.id);
    set.headers["content-type"] = "application/json";
    set.headers["content-disposition"] =
      `attachment; filename="${result.filename}"`;
    return new Response(result.data, {
      headers: { "content-type": "application/json" },
    });
  })

  .get("/cards/:id/export", async ({ params, cookie, set }) => {
    const userId = await getUserId(cookie);
    const result = await exportCard(userId, params.id);
    set.headers["content-type"] = "application/json";
    set.headers["content-disposition"] =
      `attachment; filename="${result.filename}"`;
    return new Response(result.data, {
      headers: { "content-type": "application/json" },
    });
  });
