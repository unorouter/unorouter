import { recArr } from "@/lib/utils/base";
import type { TriggerContext } from "../types";
import {
  buildRisuChatApi,
  fromRisuRole,
  makeRequestLimiter,
  toRisuRole,
} from "../risu-chat-api";
import { luaLowLevelIds, luaSafeIds } from "./engine";

type LuaFn = (...args: never[]) => unknown;

const request = makeRequestLimiter();

function promptToChatML(prompt: { role: string; content: string }[]): string {
  return prompt
    .map((p) => `<|im_start|>${p.role}\n${p.content}<|im_end|>`)
    .join("\n");
}

export function buildLuaApi(ctx: TriggerContext): Record<string, LuaFn> {
  const safe = (id: string) => luaSafeIds.has(id);
  const low = (id: string) => luaLowLevelIds.has(id);

  const llm = async (id: string, promptStr: string): Promise<string> => {
    if (!low(id)) return JSON.stringify(null);
    if (!ctx.ops?.runLLM) {
      return JSON.stringify({ success: false, result: "LLM unsupported" });
    }
    try {
      // promptStr comes from user-authored Lua across the wasm boundary, so
      // every entry is shaped here before it is interpolated into ChatML.
      const prompt = recArr(JSON.parse(promptStr)).map((p) => ({
        role: typeof p.role === "string" ? p.role : "user",
        content: typeof p.content === "string" ? p.content : "",
      }));
      const result = await ctx.ops.runLLM(promptToChatML(prompt));
      return JSON.stringify({
        success: !result.startsWith("Error:"),
        result,
      });
    } catch (err) {
      return JSON.stringify({ success: false, result: String(err) });
    }
  };

  const api = buildRisuChatApi(
    () => ctx,
    () => ctx,
  );
  const gated =
    <A extends unknown[], R>(fn: (...a: A) => R) =>
    (id: string, ...a: A) =>
      safe(id) ? fn(...a) : undefined;
  const open =
    <A extends unknown[], R>(fn: (...a: A) => R) =>
    (_id: string, ...a: A) =>
      fn(...a);

  return {
    getChatVar: (_id: string, key: string) => ctx.vars[key] ?? "null",
    setChatVar: gated(api.setChatVar),
    getGlobalVar: (_id: string, key: string) => ctx.globalVars[key] ?? "null",

    stopChat: (id: string) => {
      if (!safe(id)) return;
      ctx.stopSending = true;
    },

    alertNormal: gated(api.alertNormal),
    alertError: gated(api.alertError),
    alertInput: gated(api.alertInput),
    alertSelect: gated(api.alertSelect),
    alertConfirm: gated(api.alertConfirm),

    getChatMain: (_id: string, index: number) => {
      const m = ctx.chat.at(index);
      if (!m) return JSON.stringify(null);
      return JSON.stringify({
        role: toRisuRole(m.role),
        data: m.data,
        time: 0,
      });
    },
    getFullChatMain: () =>
      JSON.stringify(
        ctx.chat.map((m) => ({
          role: toRisuRole(m.role),
          data: m.data,
          time: 0,
        })),
      ),
    setFullChatMain: (id: string, value: string) => {
      if (!safe(id)) return;
      const real = recArr(JSON.parse(value));
      ctx.chat.length = 0;
      for (const v of real) {
        if (typeof v.role !== "string" || typeof v.data !== "string") continue;
        ctx.chat.push({ role: fromRisuRole(v.role), data: v.data });
      }
    },
    setChat: gated(api.setChat),
    setChatRole: gated(api.setChatRole),
    cutChat: gated(api.cutChat),
    removeChat: gated(api.removeChat),
    addChat: gated(api.addChat),
    insertChat: gated(api.insertChat),
    getChatLength: open(api.getChatLength),

    getName: open(api.getName),
    setName: gated(api.setName),
    getDescription: open(api.getDescription),
    setDescription: gated(api.setDescription),
    getAuthorsNote: open(api.getAuthorsNote),
    getPersonaName: open(api.getPersonaName),
    getPersonaDescription: open(api.getPersonaDescription),
    getCharacterFirstMessage: open(api.getCharacterFirstMessage),
    setCharacterFirstMessage: gated(api.setCharacterFirstMessage),
    getCharacterLastMessage: open(api.getCharacterLastMessage),
    getUserLastMessage: open(api.getUserLastMessage),

    getLoreBooksMain: (_id: string, search: string) =>
      JSON.stringify(api.getLoreBooks(search)),
    loadLoreBooksMain: async () => JSON.stringify(ctx.lore),
    upsertLocalLoreBook: gated(api.upsertLoreBook),

    getBackgroundEmbedding: () => ctx.vars["__backgroundEmbedding"] ?? "",
    setBackgroundEmbedding: (id: string, value: string) => {
      if (!safe(id)) return;
      ctx.vars["__backgroundEmbedding"] = value;
    },

    cbs: api.cbs,
    getTokens: gated(api.getTokens),
    hash: open(api.hash),
    sleep: gated(api.sleep),
    reloadDisplay: () => undefined,
    reloadChat: () => undefined,
    getCharacterImageMain: async () => "",
    getPersonaImageMain: async () => "",

    similarity: async (id: string, source: string, value: string[]) => {
      if (!low(id)) return;
      return (await ctx.ops?.similarity?.(source, value)) ?? [];
    },
    request: async (id: string, url: string) => {
      if (!low(id)) return;
      return JSON.stringify(await request(url));
    },
    generateImage: async (id: string, value: string, negValue = "") => {
      if (!low(id)) return;
      return (
        (await ctx.ops?.imgGen?.(value, negValue)) ??
        "Error: Image generation failed"
      );
    },
    LLMMain: llm,
    axLLMMain: llm,
    simpleLLM: async (id: string, prompt: string) => {
      if (!low(id)) return;
      if (!ctx.ops?.runLLM) {
        return JSON.stringify({ success: false, result: "LLM unsupported" });
      }
      const result = await ctx.ops.runLLM(prompt);
      return JSON.stringify({
        success: !result.startsWith("Error:"),
        result,
      });
    },
  };
}
