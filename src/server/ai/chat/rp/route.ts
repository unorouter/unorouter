import { Elysia } from "elysia";
import {
  characterExportQuery,
  lorebookExportQuery,
} from "@/lib/validation/rp";
import { getUserId } from "@/server/constants";
import {
  exportCharacter,
  getCharacter,
  listCharacters,
} from "./character.service";
import { getSettings } from "./conversation-settings.service";
import { getBindings } from "./binding.service";
import {
  exportLorebook,
  getLorebook,
  listLorebooks,
} from "./lorebook.service";
import { getPersona, listPersonas } from "./persona.service";
import { exportPreset, getPreset, listPresets } from "./preset.service";
import { exportCard, getCard, listCards } from "./card.service";

export const rpRoute = new Elysia({ prefix: "/rp" })
  .get("/characters", async ({ cookie }) => {
    const userId = await getUserId(cookie);
    return { success: true, data: await listCharacters(userId) };
  })
  .get("/characters/:id", async ({ params, cookie }) => {
    const userId = await getUserId(cookie);
    return { success: true, data: await getCharacter(userId, params.id) };
  })
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

  .get("/personas", async ({ cookie }) => {
    const userId = await getUserId(cookie);
    return { success: true, data: await listPersonas(userId) };
  })
  .get("/personas/:id", async ({ params, cookie }) => {
    const userId = await getUserId(cookie);
    return { success: true, data: await getPersona(userId, params.id) };
  })

  .get("/lorebooks", async ({ cookie }) => {
    const userId = await getUserId(cookie);
    return { success: true, data: await listLorebooks(userId) };
  })
  .get("/lorebooks/:id", async ({ params, cookie }) => {
    const userId = await getUserId(cookie);
    return { success: true, data: await getLorebook(userId, params.id) };
  })
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

  .get("/presets", async ({ cookie }) => {
    const userId = await getUserId(cookie);
    return { success: true, data: await listPresets(userId) };
  })
  .get("/presets/:id", async ({ params, cookie }) => {
    const userId = await getUserId(cookie);
    return { success: true, data: await getPreset(userId, params.id) };
  })
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

  .get("/cards", async ({ cookie }) => {
    const userId = await getUserId(cookie);
    return { success: true, data: await listCards(userId) };
  })
  .get("/cards/:id", async ({ params, cookie }) => {
    const userId = await getUserId(cookie);
    return { success: true, data: await getCard(userId, params.id) };
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
  })

  .get("/conversations/:id/settings", async ({ params, cookie }) => {
    const userId = (await getUserId(cookie, true)) ?? 0;
    return { success: true, data: await getSettings(userId, params.id) };
  })
  .get("/conversations/:id/bindings", async ({ params, cookie }) => {
    const userId = (await getUserId(cookie, true)) ?? 0;
    return { success: true, data: await getBindings(userId, params.id) };
  });
