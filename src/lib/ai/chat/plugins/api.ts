import type { TriggerContext } from "../triggers/types";
import {
  buildRisuChatApi,
  fromRisuRole,
  makeRequestLimiter,
  toRisuRole,
} from "../triggers/risu-chat-api";

export type PluginHookMode = "input" | "output" | "request" | "display";

const PLUGIN_HOOK_MODES: readonly PluginHookMode[] = [
  "input",
  "output",
  "request",
  "display",
];

export type PluginHandler = (content: unknown) => Promise<unknown>;

type PluginHostBridge = {
  registerHandler: (mode: PluginHookMode, fn: PluginHandler) => void;
  removeHandler: (mode: PluginHookMode, fn: PluginHandler) => void;
  getCtx: () => TriggerContext | null;
};

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
    log: () => {},

    ...buildRisuChatApi(ctx, write),
    getChatVar: (key: string) => ctx().vars[key] ?? null,
    getGlobalVar: (key: string) => ctx().globalVars[key] ?? null,
    stopChat: () => {
      write().stopSending = true;
    },
    getChat: (index: number) => {
      const m = ctx().chat.at(index);
      return m ? { role: toRisuRole(m.role), data: m.data } : null;
    },
    getFullChat: () =>
      ctx().chat.map((m) => ({ role: toRisuRole(m.role), data: m.data })),
    setFullChat: (value: { role: string; data: string }[]) => {
      const c = write();
      c.chat.length = 0;
      for (const v of value) {
        c.chat.push({ role: fromRisuRole(v.role), data: String(v.data) });
      }
    },
    httpRequest: makeRequestLimiter(),

    ...PLUGIN_API_BOOTSTRAP,
  };
}

// The guest bridge calls these before any plugin code runs and logs a failure
// if they are missing, so every api handed to a SandboxHost needs them, even
// one that exposes nothing else.
export const PLUGIN_API_BOOTSTRAP = {
  _getPropertiesForInitialization: () => ({
    list: ["apiVersion"],
    apiVersion: "1.0",
  }),
  _getAliases: () => ({}),
};

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
};

export function buildJanitorRunSource(
  snapshot: JanitorContextSnapshot,
  scripts: string[],
): string {
  const ctxJson = JSON.stringify(snapshot);
  const scriptsJson = JSON.stringify(scripts);
  return `
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
      } catch {}
    }
    return {
      personality: String(context.character.personality ?? ''),
      scenario: String(context.character.scenario ?? ''),
      example_dialogs: String(context.character.example_dialogs ?? ''),
    };
  `;
}

// Perchance AI Character Chat custom code: an `oc` object, MessageAdded
// handlers, and per-thread and per-character customData that persist.
type PerchanceMessage = {
  author: "user" | "ai" | "system";
  content: string;
  name?: string;
  hiddenFrom?: string[];
};

export type PerchanceSnapshot = {
  character: {
    name: string;
    roleInstruction: string;
    reminderMessage: string;
  };
  userName: string;
  messages: PerchanceMessage[];
};

export type PerchanceRunResult = {
  roleInstruction: string;
  reminderMessage: string;
  messages: PerchanceMessage[];
};

export function buildPerchanceRunSource(
  snapshot: PerchanceSnapshot,
  scripts: { id: string; code: string; thread: unknown; character: unknown }[],
): string {
  return `
    const snap = ${JSON.stringify(snapshot)};
    const scripts = ${JSON.stringify(scripts)};
    const character = { ...snap.character };
    const messages = snap.messages.map((m, i) => ({ id: i, ...m }));
    const data = {};
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const noop = () => {};
    for (const s of scripts) {
      const handlers = [];
      const oc = {
        character: { ...character, customData: s.character || {} },
        userCharacter: { name: snap.userName },
        thread: {
          messages,
          customData: s.thread || {},
          on: (ev, fn) => { if (ev === 'MessageAdded') handlers.push(fn); },
          off: noop, once: (ev, fn) => { if (ev === 'MessageAdded') handlers.push(fn); },
        },
        window: { show: noop, hide: noop },
        getChatCompletion: async () => '',
        getInstructCompletion: async () => ({ text: '' }),
      };
      try {
        await new AsyncFunction('oc', s.code)(oc);
        const last = messages[messages.length - 1];
        for (const fn of handlers) await fn({ message: last, messageId: last?.id });
      } catch {}
      character.roleInstruction = String(oc.character.roleInstruction ?? character.roleInstruction);
      character.reminderMessage = String(oc.character.reminderMessage ?? character.reminderMessage);
      data[s.id] = { thread: oc.thread.customData, character: oc.character.customData };
    }
    return JSON.parse(JSON.stringify({
      roleInstruction: character.roleInstruction,
      reminderMessage: character.reminderMessage,
      messages: messages.map((m) => ({ author: m.author, content: String(m.content ?? ''), hiddenFrom: m.hiddenFrom })),
      data,
    }));
  `;
}
