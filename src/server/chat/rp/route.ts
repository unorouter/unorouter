import { Elysia } from "elysia";
import {
  characterBody,
  characterCardImportBody,
  characterExportQuery,
  exportQuery,
  importConversationBody,
  lorebookBody,
  lorebookEntryBody,
  lorebookExportQuery,
  lorebookImportBody,
  personaBody,
  personaImportBody,
  samplingPresetBody,
} from "@/lib/validation/rp";
import {
  updateConversationBindingsBody,
  updateConversationSettingsBody,
} from "@/lib/validation/chat";
import { getUserId } from "@/server/constants";
import {
  createCharacter,
  deleteCharacter,
  exportCharacter,
  getCharacter,
  importCharacterCard,
  listCharacters,
  updateCharacter,
} from "./character.service";
import { getSettings, updateSettings } from "../conversation.service";
import { getBindings, updateBindings } from "./binding.service";
import {
  exportConversationNative,
  exportConversationOrpg,
  exportConversationSillyTavern,
} from "../transfer/export.service";
import { importConversation } from "../transfer/import.service";
import {
  createEntry,
  createLorebook,
  deleteEntry,
  deleteLorebook,
  exportLorebook,
  getLorebook,
  importLorebook,
  listLorebooks,
  updateEntry,
  updateLorebook,
} from "./lorebook.service";
import {
  createPersona,
  deletePersona,
  getPersona,
  importPersona,
  listPersonas,
  updatePersona,
} from "./persona.service";
import {
  createPreset,
  deletePreset,
  getPreset,
  listPresets,
  updatePreset,
} from "./preset.service";

export const rpRoute = new Elysia({ prefix: "/rp" })
  // ----- Characters --------------------------------------------------------
  .get("/characters", async ({ cookie }) => {
    const userId = getUserId(cookie);
    return { success: true, data: await listCharacters(userId) };
  })
  .get("/characters/:id", async ({ params, cookie }) => {
    const userId = getUserId(cookie);
    return { success: true, data: await getCharacter(userId, params.id) };
  })
  .post(
    "/characters",
    async ({ body, cookie }) => {
      const userId = getUserId(cookie);
      return { success: true, data: await createCharacter(userId, body) };
    },
    { body: characterBody },
  )
  .put(
    "/characters/:id",
    async ({ params, body, cookie }) => {
      const userId = getUserId(cookie);
      return {
        success: true,
        data: await updateCharacter(userId, params.id, body),
      };
    },
    { body: characterBody },
  )
  .delete("/characters/:id", async ({ params, cookie }) => {
    const userId = getUserId(cookie);
    return { success: true, data: await deleteCharacter(userId, params.id) };
  })
  .post(
    "/characters/import",
    async ({ body, cookie }) => {
      const userId = getUserId(cookie);
      return {
        success: true,
        data: await importCharacterCard(userId, body.file),
      };
    },
    { body: characterCardImportBody },
  )
  .get(
    "/characters/:id/export",
    async ({ params, query, cookie, set }) => {
      const userId = getUserId(cookie);
      const format = query.format ?? "png";
      const result = await exportCharacter(userId, params.id, format);
      set.headers["content-type"] = result.mimeType;
      set.headers["content-disposition"] =
        `attachment; filename="character-${params.id}.${result.ext}"`;
      // Copy bytes onto a fresh ArrayBuffer so the Web `BodyInit` typing
      // accepts it (Uint8Array<ArrayBufferLike> doesn't match BlobPart).
      const ab = new ArrayBuffer(result.data.byteLength);
      new Uint8Array(ab).set(result.data);
      return new Response(new Blob([ab], { type: result.mimeType }), {
        headers: { "content-type": result.mimeType },
      });
    },
    { query: characterExportQuery },
  )

  // ----- Personas ----------------------------------------------------------
  .get("/personas", async ({ cookie }) => {
    const userId = getUserId(cookie);
    return { success: true, data: await listPersonas(userId) };
  })
  .get("/personas/:id", async ({ params, cookie }) => {
    const userId = getUserId(cookie);
    return { success: true, data: await getPersona(userId, params.id) };
  })
  .post(
    "/personas",
    async ({ body, cookie }) => {
      const userId = getUserId(cookie);
      return { success: true, data: await createPersona(userId, body) };
    },
    { body: personaBody },
  )
  .put(
    "/personas/:id",
    async ({ params, body, cookie }) => {
      const userId = getUserId(cookie);
      return {
        success: true,
        data: await updatePersona(userId, params.id, body),
      };
    },
    { body: personaBody },
  )
  .delete("/personas/:id", async ({ params, cookie }) => {
    const userId = getUserId(cookie);
    return { success: true, data: await deletePersona(userId, params.id) };
  })
  .post(
    "/personas/import",
    async ({ body, cookie }) => {
      const userId = getUserId(cookie);
      return {
        success: true,
        data: await importPersona(userId, body.file),
      };
    },
    { body: personaImportBody },
  )

  // ----- Lorebooks ---------------------------------------------------------
  .get("/lorebooks", async ({ cookie }) => {
    const userId = getUserId(cookie);
    return { success: true, data: await listLorebooks(userId) };
  })
  .get("/lorebooks/:id", async ({ params, cookie }) => {
    const userId = getUserId(cookie);
    return { success: true, data: await getLorebook(userId, params.id) };
  })
  .post(
    "/lorebooks",
    async ({ body, cookie }) => {
      const userId = getUserId(cookie);
      return { success: true, data: await createLorebook(userId, body) };
    },
    { body: lorebookBody },
  )
  .put(
    "/lorebooks/:id",
    async ({ params, body, cookie }) => {
      const userId = getUserId(cookie);
      return {
        success: true,
        data: await updateLorebook(userId, params.id, body),
      };
    },
    { body: lorebookBody },
  )
  .delete("/lorebooks/:id", async ({ params, cookie }) => {
    const userId = getUserId(cookie);
    return { success: true, data: await deleteLorebook(userId, params.id) };
  })
  .post(
    "/lorebooks/import",
    async ({ body, cookie }) => {
      const userId = getUserId(cookie);
      return {
        success: true,
        data: await importLorebook(userId, body.file),
      };
    },
    { body: lorebookImportBody },
  )
  .get(
    "/lorebooks/:id/export",
    async ({ params, query, cookie, set }) => {
      const userId = getUserId(cookie);
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

  // Lorebook entries
  .post(
    "/lorebooks/:id/entries",
    async ({ params, body, cookie }) => {
      const userId = getUserId(cookie);
      return {
        success: true,
        data: await createEntry(userId, params.id, body),
      };
    },
    { body: lorebookEntryBody },
  )
  .put(
    "/lorebooks/:id/entries/:entryId",
    async ({ params, body, cookie }) => {
      const userId = getUserId(cookie);
      return {
        success: true,
        data: await updateEntry(userId, params.id, params.entryId, body),
      };
    },
    { body: lorebookEntryBody },
  )
  .delete(
    "/lorebooks/:id/entries/:entryId",
    async ({ params, cookie }) => {
      const userId = getUserId(cookie);
      return {
        success: true,
        data: await deleteEntry(userId, params.id, params.entryId),
      };
    },
  )

  // ----- Presets -----------------------------------------------------------
  .get("/presets", async ({ cookie }) => {
    const userId = getUserId(cookie);
    return { success: true, data: await listPresets(userId) };
  })
  .get("/presets/:id", async ({ params, cookie }) => {
    const userId = getUserId(cookie);
    return { success: true, data: await getPreset(userId, params.id) };
  })
  .post(
    "/presets",
    async ({ body, cookie }) => {
      const userId = getUserId(cookie);
      return { success: true, data: await createPreset(userId, body) };
    },
    { body: samplingPresetBody },
  )
  .put(
    "/presets/:id",
    async ({ params, body, cookie }) => {
      const userId = getUserId(cookie);
      return {
        success: true,
        data: await updatePreset(userId, params.id, body),
      };
    },
    { body: samplingPresetBody },
  )
  .delete("/presets/:id", async ({ params, cookie }) => {
    const userId = getUserId(cookie);
    return { success: true, data: await deletePreset(userId, params.id) };
  })

  // ----- Conversation settings + bindings ----------------------------------
  // Guests own conversation_settings rows under userId=0 (created by
  // POST /api/chat for anonymous users). Reads + sampling-knob writes use
  // `getUserId(cookie, true) ?? 0` so guests can edit per-conversation
  // overrides for their own convs. Bindings remain logged-in only on the
  // write path because they reference user-owned characters/lorebooks; reads
  // return whatever rows exist (guest convs have none).
  .get("/conversations/:id/settings", async ({ params, cookie }) => {
    const userId = getUserId(cookie, true) ?? 0;
    return { success: true, data: await getSettings(userId, params.id) };
  })
  .put(
    "/conversations/:id/settings",
    async ({ params, body, cookie }) => {
      const userId = getUserId(cookie, true) ?? 0;
      return {
        success: true,
        data: await updateSettings(userId, params.id, body),
      };
    },
    { body: updateConversationSettingsBody },
  )
  .get("/conversations/:id/bindings", async ({ params, cookie }) => {
    const userId = getUserId(cookie, true) ?? 0;
    return { success: true, data: await getBindings(userId, params.id) };
  })
  .put(
    "/conversations/:id/bindings",
    async ({ params, body, cookie }) => {
      const userId = getUserId(cookie);
      return {
        success: true,
        data: await updateBindings(userId, params.id, body),
      };
    },
    { body: updateConversationBindingsBody },
  )

  // ----- Export / Import ---------------------------------------------------
  // Conversation export is guest-tolerant: guests own their own conversation
  // rows under userId=0 and should be able to back them up. The export
  // services already gate access by `(userId, convId)` so a guest's cookie
  // can only ever pull their own convs.
  .get(
    "/conversations/:id/export",
    async ({ params, query, cookie, set }) => {
      const userId = getUserId(cookie, true) ?? 0;
      // SillyTavern JSONL is a download; native and orpg flow through the
      // standard JSON envelope so the client can copy/inspect them.
      if (query.format === "sillytavern") {
        const result = await exportConversationSillyTavern(userId, params.id);
        set.headers["content-type"] = "application/jsonl";
        set.headers["content-disposition"] =
          `attachment; filename="${result.filename}"`;
        return new Response(result.data, {
          headers: { "content-type": "application/jsonl" },
        });
      }
      const data =
        query.format === "orpg"
          ? await exportConversationOrpg(userId, params.id)
          : await exportConversationNative(userId, params.id);
      return { success: true, data };
    },
    { query: exportQuery },
  )
  .post(
    "/conversations/import",
    async ({ body, cookie }) => {
      const userId = getUserId(cookie);
      return {
        success: true,
        data: await importConversation(userId, body.file),
      };
    },
    { body: importConversationBody },
  );
