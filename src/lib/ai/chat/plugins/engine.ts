"use client";

import { chatStore } from "@/store/chat-store";
import { atom } from "jotai";
import type { TriggerContext } from "../triggers/types";
import type { PluginHandler, PluginHookMode } from "./api";

// Instance manager for sandboxed JS plugins. One hidden iframe per enabled
// plugin, created once at chat-runtime mount and fully reloaded whenever a
// plugin row changes (Risu's lifecycle). Janitor-kind scripts do not run at
// load: they execute per turn through a shared scratch sandbox.
//
// Every entry no-ops without a window: the pipeline stages that call the run
// functions are isomorphic, but plugins are a browser-only feature.

export type LoadedJsPlugin = {
  id: string;
  name: string;
  script: string;
  kind: "uno" | "janitor";
  enabled: boolean;
};

type PluginInstance = {
  id: string;
  name: string;
  terminate: () => void;
  handlers: Map<PluginHookMode, Set<PluginHandler>>;
  logs: string[];
};

const instances: PluginInstance[] = [];
let janitorScripts: { name: string; script: string }[] = [];
let scratchHost: {
  executeInIframe: (code: string) => Promise<unknown>;
} | null = null;
let scratchTerminate: (() => void) | null = null;
let loadedKey = "";

// The hook invocation sets the context the host API operates on; outside an
// invocation chat accessors throw. Handlers run sequentially, so one slot.
let activeCtx: TriggerContext | null = null;

const HANDLER_TIMEOUT_MS = 5_000;

function withTimeout<T>(p: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out`)),
        HANDLER_TIMEOUT_MS,
      ),
    ),
  ]);
}

export function detectPluginKind(script: string): "uno" | "janitor" {
  return /\bcontext\s*\./.test(script) && !/registerHandler/.test(script)
    ? "janitor"
    : "uno";
}

export function unloadJsPlugins(): void {
  for (const inst of instances) {
    try {
      inst.terminate();
    } catch {
      // a failed teardown must not stop the rest
    }
  }
  instances.length = 0;
  janitorScripts = [];
  if (scratchTerminate) {
    try {
      scratchTerminate();
    } catch {
      // idem
    }
    scratchTerminate = null;
    scratchHost = null;
  }
  loadedKey = "";
}

export async function loadJsPlugins(rows: LoadedJsPlugin[]): Promise<void> {
  if (typeof window === "undefined") return;
  const enabled = rows.filter((r) => r.enabled);
  // Cheap idempotence: the runtime provider calls this on every query refresh.
  const key = enabled.map((r) => `${r.id}:${r.script.length}`).join("|");
  if (key === loadedKey) return;
  unloadJsPlugins();
  loadedKey = key;
  if (enabled.length === 0) return;

  const [{ SandboxHost }, { buildPluginApi }, { transpilePluginCode }] =
    await Promise.all([
      import("./sandbox-host"),
      import("./api"),
      import("./transpile"),
    ]);

  for (const row of enabled) {
    let code = row.script;
    try {
      code = await transpilePluginCode(row.script);
    } catch {
      // plain JS that sucrase rejects still gets a chance to run verbatim
    }

    if (row.kind === "janitor") {
      janitorScripts.push({ name: row.name, script: code });
      continue;
    }

    const handlers = new Map<PluginHookMode, Set<PluginHandler>>();
    const logs: string[] = [];
    const host = new SandboxHost(
      buildPluginApi({
        registerHandler: (mode, fn) => {
          const set = handlers.get(mode) ?? new Set();
          set.add(fn);
          handlers.set(mode, set);
        },
        removeHandler: (mode, fn) => {
          handlers.get(mode)?.delete(fn);
        },
        getCtx: () => activeCtx,
        log: (line) => {
          logs.push(line);
          if (logs.length > 200) logs.shift();
        },
      }),
    );
    const frame = document.createElement("iframe");
    frame.style.display = "none";
    document.body.appendChild(frame);
    const terminate = host.run(frame, code);
    instances.push({ id: row.id, name: row.name, terminate, handlers, logs });
  }

  if (janitorScripts.length > 0) {
    const host = new SandboxHost({});
    const frame = document.createElement("iframe");
    frame.style.display = "none";
    document.body.appendChild(frame);
    scratchTerminate = host.run(frame, "");
    scratchHost = host;
  }
}

export function jsPluginLogs(): { name: string; logs: string[] }[] {
  return instances.map((i) => ({ name: i.name, logs: [...i.logs] }));
}

export function hasJsHandlers(mode: PluginHookMode): boolean {
  return instances.some((i) => (i.handlers.get(mode)?.size ?? 0) > 0);
}

// The fold every hook site uses: content passes through each live handler in
// registration order; a nullish return keeps the previous value; any throw or
// timeout is swallowed and the fold continues. Fail-open like runLuaEditTrigger.
export async function runJsEditTrigger<T>(
  mode: PluginHookMode,
  ctx: TriggerContext,
  content: T,
): Promise<T> {
  if (typeof window === "undefined") return content;
  if (!hasJsHandlers(mode)) return content;
  let data = content;
  activeCtx = ctx;
  try {
    for (const inst of instances) {
      const set = inst.handlers.get(mode);
      if (!set) continue;
      for (const fn of set) {
        try {
          const res = await withTimeout(
            Promise.resolve(fn(data)),
            `${inst.name} ${mode} handler`,
          );
          if (res !== null && res !== undefined) data = res as T;
        } catch {
          // fail-open: a broken plugin must not break the chat
        }
      }
    }
  } finally {
    activeCtx = null;
  }
  return data;
}

export function hasJanitorScripts(): boolean {
  return janitorScripts.length > 0;
}

// Display handlers run through the async RPC, but the markdown preprocess is
// synchronous, so results resolve into a cache and a version bump re-renders
// (the same shape as the inlay/img token resolvers). The untransformed text
// shows for the first paint only.
export const jsDisplayVersionAtom = atom(0);
const displayCache = new Map<string, string>();
const displayPending = new Set<string>();

function displayKey(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = (h * 33) ^ text.charCodeAt(i);
  return (h >>> 0).toString(36) + ":" + text.length;
}

export function invalidateJsDisplayCache(): void {
  displayCache.clear();
  chatStore.set(jsDisplayVersionAtom, chatStore.get(jsDisplayVersionAtom) + 1);
}

export function transformDisplayJsSync(text: string): string {
  if (typeof window === "undefined") return text;
  if (!hasJsHandlers("display")) return text;
  const key = displayKey(text);
  const cached = displayCache.get(key);
  if (cached !== undefined) return cached;
  if (!displayPending.has(key)) {
    displayPending.add(key);
    const ctx: TriggerContext = {
      mode: "display",
      vars: {},
      globalVars: {},
      chat: [],
      charDesc: "",
      personaDesc: "",
      authorNote: "",
      replaceGlobalNote: "",
      lore: [],
      additionalSysPrompt: { start: "", historyend: "", promptend: "" },
      charName: "",
      userName: "",
    };
    void runJsEditTrigger("display", ctx, text)
      .then((res) => {
        displayCache.set(key, typeof res === "string" ? res : text);
        if (displayCache.size > 500) {
          const first = displayCache.keys().next().value;
          if (first !== undefined) displayCache.delete(first);
        }
        chatStore.set(
          jsDisplayVersionAtom,
          chatStore.get(jsDisplayVersionAtom) + 1,
        );
      })
      .finally(() => displayPending.delete(key));
  }
  return text;
}

export async function runJanitorScriptsForTurn(snapshot: {
  character: {
    name: string;
    chat_name: string;
    example_dialogs: string;
    personality: string;
    scenario: string;
  };
  chat: {
    last_message: string;
    lastMessage: string;
    message_count: number;
    first_message_date: number | null;
    last_bot_message_date: number | null;
    last_messages: { message: string }[];
  };
}): Promise<{ personality: string; scenario: string; logs: string[] } | null> {
  if (typeof window === "undefined") return null;
  if (!scratchHost || janitorScripts.length === 0) return null;
  const { buildJanitorRunSource } = await import("./api");
  try {
    const result = await withTimeout(
      scratchHost.executeInIframe(
        buildJanitorRunSource(
          snapshot,
          janitorScripts.map((s) => s.script),
        ),
      ),
      "janitor scripts",
    );
    if (!result || typeof result !== "object") return null;
    const r = result as {
      personality?: unknown;
      scenario?: unknown;
      logs?: unknown;
    };
    return {
      personality: String(r.personality ?? snapshot.character.personality),
      scenario: String(r.scenario ?? snapshot.character.scenario),
      logs: Array.isArray(r.logs) ? r.logs.map(String) : [],
    };
  } catch {
    // silent failure is the Janitor contract
    return null;
  }
}
