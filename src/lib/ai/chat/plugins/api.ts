import { guestFetch } from "@/lib/ai/chat/guest-fetch";
import { sha256Hex } from "@/lib/utils/base";
import { countTokens } from "@/lib/ai/chat/tokenizer";
import type { TriggerContext, TriggerMessage } from "../triggers/types";

// Mirrors the Lua binding set over the same TriggerContext.

export type PluginHookMode = "input" | "output" | "request" | "display";

export const PLUGIN_HOOK_MODES: readonly PluginHookMode[] = [
  "input",
  "output",
  "request",
  "display",
];

export type PluginHandler = (content: unknown) => Promise<unknown>;

export type PluginHostBridge = {
  registerHandler: (mode: PluginHookMode, fn: PluginHandler) => void;
  removeHandler: (mode: PluginHookMode, fn: PluginHandler) => void;
  getCtx: () => TriggerContext | null;
  log: (line: string) => void;
};

const toPluginRole = (r: TriggerMessage["role"]) =>
  r === "assistant" ? "char" : r;
const fromPluginRole = (r: string): TriggerMessage["role"] =>
  r === "user" ? "user" : "assistant";

let lastRequestsCount = 0;
let lastRequestResetTime = 0;

export function buildPluginApi(
  bridge: PluginHostBridge,
): Record<string, unknown> {
  const ctx = (): TriggerContext => {
    const c = bridge.getCtx();
    if (!c)
      throw new Error(
        "no active chat context: only available inside a registered handler",
      );
    return c;
  };
  const write = (): TriggerContext => {
    const c = ctx();
    if (c.mode === "display") throw new Error("display handlers are read-only");
    return c;
  };
  const parse = (s: string) => {
    const c = ctx();
    return c.parse ? c.parse(s) : s;
  };

  const isMode = (v: unknown): v is PluginHookMode =>
    PLUGIN_HOOK_MODES.some((m) => m === v);

  return {
    registerHandler: (mode: unknown, fn: PluginHandler) => {
      if (!isMode(mode)) throw new Error(`unknown handler mode: ${mode}`);
      if (typeof fn !== "function")
        throw new Error("handler must be a function");
      bridge.registerHandler(mode, fn);
    },
    removeHandler: (mode: unknown, fn: PluginHandler) => {
      if (!isMode(mode)) throw new Error(`unknown handler mode: ${mode}`);
      bridge.removeHandler(mode, fn);
    },
    log: (...parts: unknown[]) => {
      bridge.log(parts.map((p) => String(p)).join(" "));
    },

    getChatVar: (key: string) => ctx().vars[key] ?? null,
    setChatVar: (key: string, value: string) => {
      write().vars[key] = String(value);
    },
    getGlobalVar: (key: string) => ctx().globalVars[key] ?? null,

    stopChat: () => {
      write().stopSending = true;
    },

    alertNormal: (value: string) => {
      void ctx().ops?.alert?.("normal", String(value));
    },
    alertError: (value: string) => {
      void ctx().ops?.alert?.("error", String(value));
    },
    alertInput: (value: string) =>
      ctx().ops?.alert?.("input", String(value)) ?? "",
    alertSelect: (options: string[]) =>
      ctx().ops?.alert?.("select", options.join("§"), options) ?? "",
    alertConfirm: async (value: string) => {
      const res = await ctx().ops?.alert?.("select", String(value), [
        "OK",
        "Cancel",
      ]);
      return res === "OK";
    },

    getChat: (index: number) => {
      const m = ctx().chat.at(index);
      return m ? { role: toPluginRole(m.role), data: m.data } : null;
    },
    getFullChat: () =>
      ctx().chat.map((m) => ({ role: toPluginRole(m.role), data: m.data })),
    setFullChat: (value: { role: string; data: string }[]) => {
      const c = write();
      c.chat.length = 0;
      for (const v of value) {
        c.chat.push({ role: fromPluginRole(v.role), data: String(v.data) });
      }
    },
    setChat: (index: number, value: string) => {
      const m = write().chat.at(index);
      if (m) m.data = String(value ?? "");
    },
    setChatRole: (index: number, role: string) => {
      const m = write().chat.at(index);
      if (m) m.role = fromPluginRole(role);
    },
    cutChat: (start: number, end: number) => {
      const c = write();
      const next = c.chat.slice(start, end);
      c.chat.length = 0;
      c.chat.push(...next);
    },
    removeChat: (index: number) => {
      write().chat.splice(index, 1);
    },
    addChat: (role: string, value: string) => {
      write().chat.push({
        role: fromPluginRole(role),
        data: String(value ?? ""),
      });
    },
    insertChat: (index: number, role: string, value: string) => {
      write().chat.splice(index, 0, {
        role: fromPluginRole(role),
        data: String(value ?? ""),
      });
    },
    getChatLength: () => ctx().chat.length,

    getName: () => ctx().charName,
    setName: (name: string) => {
      if (typeof name !== "string") throw new Error("Invalid data type");
      write().charName = name;
    },
    getDescription: () => ctx().charDesc,
    setDescription: (desc: string) => {
      if (typeof desc !== "string") throw new Error("Invalid data type");
      write().charDesc = desc;
    },
    getAuthorsNote: () => ctx().authorNote,
    getPersonaName: () => ctx().userName,
    getPersonaDescription: () => ctx().personaDesc,
    getCharacterFirstMessage: () => ctx().firstMessage ?? "",
    setCharacterFirstMessage: (value: string) => {
      if (typeof value !== "string") return false;
      write().firstMessage = value;
      return true;
    },
    getCharacterLastMessage: () => {
      const c = ctx();
      for (let i = c.chat.length - 1; i >= 0; i--) {
        if (c.chat[i].role === "assistant") return c.chat[i].data;
      }
      return c.firstMessage ?? "";
    },
    getUserLastMessage: () => {
      const c = ctx();
      for (let i = c.chat.length - 1; i >= 0; i--) {
        if (c.chat[i].role === "user") return c.chat[i].data;
      }
      return "";
    },

    getLoreBooks: (search?: string) =>
      ctx().lore.filter(
        (l) => !search || l.comment === search || l.key.includes(search),
      ),
    upsertLoreBook: (key: string, content: string, comment: string) => {
      const c = write();
      const existing = c.lore.find((l) => l.comment === comment);
      if (existing) {
        existing.key = key;
        existing.content = content;
      } else {
        c.lore.push({ comment, content, key, alwaysActive: false });
      }
    },

    cbs: (value: string) => parse(String(value)),
    getTokens: (value: string) => countTokens(String(value ?? "")),
    hash: (value: string) => sha256Hex(String(value)),
    sleep: (time: number) =>
      new Promise((r) => setTimeout(() => r(true), Math.min(time, 10_000))),

    // SECURITY: connect-src 'none' blocks the iframe entirely, so this is a
    // plugin's ONLY network access. Egress policy: client-only, https GET,
    // <=120 chars, 5 per minute, and never this site (see guestFetch).
    httpRequest: async (url: string) => {
      if (typeof window === "undefined") {
        return { status: 400, data: "request is not allowed server-side" };
      }
      if (lastRequestResetTime + 60_000 < Date.now()) {
        lastRequestsCount = 0;
        lastRequestResetTime = Date.now();
      }
      if (lastRequestsCount > 5) {
        return {
          status: 429,
          data: "Too many requests. you can request 5 times per minute",
        };
      }
      lastRequestsCount++;
      return guestFetch(url);
    },

    _getPropertiesForInitialization: () => ({
      list: ["apiVersion"],
      apiVersion: "1.0",
    }),
    _getAliases: () => ({}),
  };
}

// JanitorAI compat: ONLY character.personality, .scenario and .example_dialogs
// are writable, and message text must round-trip UNMODIFIED (scripts encode
// cross-turn state into the reply and re-parse it from chat.last_messages).
export type JanitorContextSnapshot = {
  character: {
    name: string;
    chat_name: string;
    example_dialogs: string;
    personality: string;
    scenario: string;
    description: string;
    first_message: string;
  };
  chat: {
    last_message: string;
    lastMessage: string;
    message_count: number;
    // Oldest first: their templates slice(-n) and scan backward.
    last_messages: { message: string }[];
    user_name: string;
    conversation_id: string;
    message_created_at: number | null;
  };
};

export type JanitorRunResult = {
  personality: string;
  scenario: string;
  example_dialogs: string;
  logs: string[];
};

export function buildJanitorRunSource(
  snapshot: JanitorContextSnapshot,
  scripts: string[],
): string {
  const ctxJson = JSON.stringify(snapshot);
  const scriptsJson = JSON.stringify(scripts);
  return `
    const logs = [];
    const origLog = console.log;
    console.log = (...a) => { logs.push(a.map(String).join(' ')); };
    const context = ${ctxJson};
    context.last_message = context.chat.last_message;
    context.lastMessage = context.chat.last_message;
    const scripts = ${scriptsJson};
    for (const src of scripts) {
      try {
        // A FUNCTION BODY, not a program: their scripts use top-level
        // \`return\` as an early exit, a syntax error under eval.
        globalThis.context = context;
        new Function('context', src)(context);
      } catch (e) {
        logs.push('script error: ' + (e && e.message ? e.message : String(e)));
      }
    }
    console.log = origLog;
    return {
      personality: String(context.character.personality ?? ''),
      scenario: String(context.character.scenario ?? ''),
      example_dialogs: String(context.character.example_dialogs ?? ''),
      logs,
    };
  `;
}
