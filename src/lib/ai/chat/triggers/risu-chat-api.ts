import { guestFetch } from "@/lib/ai/chat/guest-fetch";
import { countTokens } from "@/lib/ai/chat/tokenizer";
import { sha256Hex } from "@/lib/utils/base";
import type { TriggerContext, TriggerMessage } from "./types";

export const toRisuRole = (r: TriggerMessage["role"]) =>
  r === "assistant" ? "char" : r;
export const fromRisuRole = (r: string): TriggerMessage["role"] =>
  r === "user" ? "user" : "assistant";

export function makeRequestLimiter() {
  let count = 0;
  let resetAt = 0;
  return async (url: string) => {
    if (resetAt + 60_000 < Date.now()) {
      count = 0;
      resetAt = Date.now();
    }
    if (count > 5) {
      return {
        status: 429,
        data: "Too many requests. you can request 5 times per minute",
      };
    }
    count++;
    return guestFetch(url);
  };
}

// The RisuAI chat API shared by Lua triggers and JS plugins; `write` is where a
// runtime refuses mutation.
export function buildRisuChatApi(
  read: () => TriggerContext,
  write: () => TriggerContext,
) {
  return {
    setChatVar: (key: string, value: string) => {
      write().vars[key] = String(value);
    },
    alertNormal: (value: string) => {
      void read().ops?.alert?.("normal", String(value));
    },
    alertError: (value: string) => {
      void read().ops?.alert?.("error", String(value));
    },
    alertInput: (value: string) =>
      read().ops?.alert?.("input", String(value)) ?? Promise.resolve(""),
    alertSelect: (options: string[]) =>
      read().ops?.alert?.("select", options.join("§"), options) ??
      Promise.resolve(""),
    alertConfirm: async (value: string) =>
      (await read().ops?.alert?.("select", String(value), ["OK", "Cancel"])) ===
      "OK",

    setChat: (index: number, value: string) => {
      const m = write().chat.at(index);
      if (m) m.data = String(value ?? "");
    },
    setChatRole: (index: number, role: string) => {
      const m = write().chat.at(index);
      if (m) m.role = fromRisuRole(role);
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
        role: fromRisuRole(role),
        data: String(value ?? ""),
      });
    },
    insertChat: (index: number, role: string, value: string) => {
      write().chat.splice(index, 0, {
        role: fromRisuRole(role),
        data: String(value ?? ""),
      });
    },
    getChatLength: () => read().chat.length,

    getName: () => read().charName,
    setName: (name: string) => {
      if (typeof name !== "string") throw new Error("Invalid data type");
      write().charName = name;
    },
    getDescription: () => read().charDesc,
    setDescription: (desc: string) => {
      if (typeof desc !== "string") throw new Error("Invalid data type");
      write().charDesc = desc;
    },
    getAuthorsNote: () => read().authorNote,
    getPersonaName: () => read().userName,
    getPersonaDescription: () => read().personaDesc,
    getCharacterFirstMessage: () => read().firstMessage ?? "",
    setCharacterFirstMessage: (value: string) => {
      if (typeof value !== "string") return false;
      write().firstMessage = value;
      return true;
    },
    getCharacterLastMessage: () => {
      const c = read();
      return (
        c.chat.findLast((m) => m.role === "assistant")?.data ??
        c.firstMessage ??
        ""
      );
    },
    getUserLastMessage: () =>
      read().chat.findLast((m) => m.role === "user")?.data ?? "",

    getLoreBooks: (search?: string) =>
      read().lore.filter(
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

    cbs: (value: string) => {
      const c = read();
      return c.parse ? c.parse(String(value)) : String(value);
    },
    getTokens: (value: string) => countTokens(String(value ?? "")),
    hash: (value: string) => sha256Hex(String(value)),
    sleep: (time: number) =>
      new Promise((r) => setTimeout(() => r(true), Math.min(time, 10_000))),
  };
}
