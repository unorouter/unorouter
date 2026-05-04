import { Elysia } from "elysia";
import {
  characterBody,
  characterCardImportBody,
  exportQuery,
  importConversationBody,
  lorebookBody,
  lorebookEntryBody,
  personaBody,
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
  getCharacter,
  importCharacterCard,
  listCharacters,
  updateCharacter,
} from "./character.service";
import {
  getBindings,
  getSettings,
  updateBindings,
  updateSettings,
} from "../conversation.service";
import {
  exportConversationNative,
  exportConversationOrpg,
} from "../transfer/export.service";
import { importConversation } from "../transfer/import.service";
import {
  createEntry,
  createLorebook,
  deleteEntry,
  deleteLorebook,
  getLorebook,
  listLorebooks,
  updateEntry,
  updateLorebook,
} from "./lorebook.service";
import {
  createPersona,
  deletePersona,
  getPersona,
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
  .get("/conversations/:id/settings", async ({ params, cookie }) => {
    const userId = getUserId(cookie);
    return { success: true, data: await getSettings(userId, params.id) };
  })
  .put(
    "/conversations/:id/settings",
    async ({ params, body, cookie }) => {
      const userId = getUserId(cookie);
      return {
        success: true,
        data: await updateSettings(userId, params.id, body),
      };
    },
    { body: updateConversationSettingsBody },
  )
  .get("/conversations/:id/bindings", async ({ params, cookie }) => {
    const userId = getUserId(cookie);
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
  .get(
    "/conversations/:id/export",
    async ({ params, query, cookie }) => {
      const userId = getUserId(cookie);
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
