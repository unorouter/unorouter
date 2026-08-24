import { recArr, sha256Hex } from "@/lib/utils/base";
import { countTokens } from "@/lib/ai/chat/tokenizer";
import type { TriggerContext, TriggerMessage } from "../types";
import { luaLowLevelIds, luaSafeIds } from "./engine";

type LuaFn = (...args: never[]) => unknown;

const toLuaRole = (r: TriggerMessage["role"]) =>
  r === "assistant" ? "char" : r;
const fromLuaRole = (r: string): TriggerMessage["role"] =>
  r === "user" ? "user" : "assistant";

let lastRequestsCount = 0;
let lastRequestResetTime = 0;

function promptToChatML(prompt: { role: string; content: string }[]): string {
  return prompt
    .map((p) => `<|im_start|>${p.role}\n${p.content}<|im_end|>`)
    .join("\n");
}

export function buildLuaApi(
  ctx: TriggerContext,
  flags: { stopSending: boolean },
): Record<string, LuaFn> {
  const safe = (id: string) => luaSafeIds.has(id);
  const low = (id: string) => luaLowLevelIds.has(id);
  const parse = (s: string) => (ctx.parse ? ctx.parse(s) : s);

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

  return {
    getChatVar: (_id: string, key: string) => ctx.vars[key] ?? "null",
    setChatVar: (id: string, key: string, value: string) => {
      if (!safe(id)) return;
      ctx.vars[key] = value;
    },
    getGlobalVar: (_id: string, key: string) => ctx.globalVars[key] ?? "null",

    stopChat: (id: string) => {
      if (!safe(id)) return;
      flags.stopSending = true;
      ctx.stopSending = true;
    },

    alertNormal: (id: string, value: string) => {
      if (!safe(id)) return;
      void ctx.ops?.alert?.("normal", value);
    },
    alertError: (id: string, value: string) => {
      if (!safe(id)) return;
      void ctx.ops?.alert?.("error", value);
    },
    alertInput: (id: string, value: string) => {
      if (!safe(id)) return;
      return ctx.ops?.alert?.("input", value) ?? Promise.resolve("");
    },
    alertSelect: (id: string, value: string[]) => {
      if (!safe(id)) return;
      return (
        ctx.ops?.alert?.("select", value.join("§"), value) ??
        Promise.resolve("")
      );
    },
    alertConfirm: async (id: string, value: string) => {
      if (!safe(id)) return;
      const res = await ctx.ops?.alert?.("select", value, ["OK", "Cancel"]);
      return res === "OK";
    },

    getChatMain: (_id: string, index: number) => {
      const m = ctx.chat.at(index);
      if (!m) return JSON.stringify(null);
      return JSON.stringify({ role: toLuaRole(m.role), data: m.data, time: 0 });
    },
    getFullChatMain: () =>
      JSON.stringify(
        ctx.chat.map((m) => ({
          role: toLuaRole(m.role),
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
        ctx.chat.push({ role: fromLuaRole(v.role), data: v.data });
      }
    },
    setChat: (id: string, index: number, value: string) => {
      if (!safe(id)) return;
      const m = ctx.chat.at(index);
      if (m) m.data = value ?? "";
    },
    setChatRole: (id: string, index: number, value: string) => {
      if (!safe(id)) return;
      const m = ctx.chat.at(index);
      if (m) m.role = fromLuaRole(value);
    },
    cutChat: (id: string, start: number, end: number) => {
      if (!safe(id)) return;
      const next = ctx.chat.slice(start, end);
      ctx.chat.length = 0;
      ctx.chat.push(...next);
    },
    removeChat: (id: string, index: number) => {
      if (!safe(id)) return;
      ctx.chat.splice(index, 1);
    },
    addChat: (id: string, role: string, value: string) => {
      if (!safe(id)) return;
      ctx.chat.push({ role: fromLuaRole(role), data: value ?? "" });
    },
    insertChat: (id: string, index: number, role: string, value: string) => {
      if (!safe(id)) return;
      ctx.chat.splice(index, 0, { role: fromLuaRole(role), data: value ?? "" });
    },
    getChatLength: () => ctx.chat.length,

    getName: () => ctx.charName,
    setName: (id: string, name: string) => {
      if (!safe(id)) return;
      if (typeof name !== "string") throw new Error("Invalid data type");
      ctx.charName = name;
    },
    getDescription: () => ctx.charDesc,
    setDescription: (id: string, desc: string) => {
      if (!safe(id)) return;
      if (typeof desc !== "string") throw new Error("Invalid data type");
      ctx.charDesc = desc;
    },
    getAuthorsNote: () => ctx.authorNote,
    getPersonaName: () => ctx.userName,
    getPersonaDescription: () => ctx.personaDesc,
    getCharacterFirstMessage: () => ctx.firstMessage ?? "",
    setCharacterFirstMessage: (id: string, value: string) => {
      if (!safe(id)) return false;
      if (typeof value !== "string") return false;
      ctx.firstMessage = value;
      return true;
    },
    getCharacterLastMessage: () => {
      for (let i = ctx.chat.length - 1; i >= 0; i--) {
        if (ctx.chat[i].role === "assistant") return ctx.chat[i].data;
      }
      return ctx.firstMessage ?? "";
    },
    getUserLastMessage: () => {
      for (let i = ctx.chat.length - 1; i >= 0; i--) {
        if (ctx.chat[i].role === "user") return ctx.chat[i].data;
      }
      return "";
    },

    getLoreBooksMain: (_id: string, search: string) =>
      JSON.stringify(
        ctx.lore.filter(
          (l) => !search || l.comment === search || l.key.includes(search),
        ),
      ),
    loadLoreBooksMain: async () => JSON.stringify(ctx.lore),
    upsertLocalLoreBook: (
      id: string,
      key: string,
      content: string,
      comment: string,
    ) => {
      if (!safe(id)) return;
      const existing = ctx.lore.find((l) => l.comment === comment);
      if (existing) {
        existing.key = key;
        existing.content = content;
      } else {
        ctx.lore.push({ comment, content, key, alwaysActive: false });
      }
    },

    getBackgroundEmbedding: () => ctx.vars["__backgroundEmbedding"] ?? "",
    setBackgroundEmbedding: (id: string, value: string) => {
      if (!safe(id)) return;
      ctx.vars["__backgroundEmbedding"] = value;
    },

    cbs: (value: string) => parse(value),
    getTokens: (id: string, value: string) => {
      if (!safe(id)) return;
      return countTokens(value ?? "");
    },
    hash: (_id: string, value: string) => sha256Hex(value),
    sleep: (id: string, time: number) => {
      if (!safe(id)) return;
      return new Promise((r) => setTimeout(() => r(true), time));
    },
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
      if (typeof window === "undefined") {
        return JSON.stringify({
          status: 400,
          data: "request is not allowed server-side",
        });
      }
      if (lastRequestResetTime + 60000 < Date.now()) {
        lastRequestsCount = 0;
        lastRequestResetTime = Date.now();
      }
      if (lastRequestsCount > 5) {
        return JSON.stringify({
          status: 429,
          data: "Too many requests. you can request 5 times per minute",
        });
      }
      lastRequestsCount++;
      try {
        if (url.length > 120) {
          return JSON.stringify({
            status: 413,
            data: "URL to large. max is 120 characters",
          });
        }
        if (!url.startsWith("https://")) {
          return JSON.stringify({
            status: 400,
            data: "Only https requests are allowed",
          });
        }
        const d = await fetch(url, { method: "GET" });
        return JSON.stringify({ status: d.status, data: await d.text() });
      } catch {
        return JSON.stringify({ status: 400, data: "internal error" });
      }
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
