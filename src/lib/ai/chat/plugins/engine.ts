import { rec } from "@/lib/utils/base";
("use client");

import { chatStore } from "@/store/chat-store";
import { atom } from "jotai";
import type { JsPluginKind } from "@/lib/validation/js-plugin";
import type { TriggerContext } from "../triggers/types";
import type {
  JanitorContextSnapshot,
  JanitorRunResult,
  PluginHandler,
  PluginHookMode,
} from "./api";

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
  kind: JsPluginKind;
  enabled: boolean;
};

type PluginInstance = {
  id: string;
  name: string;
  terminate: () => void;
  handlers: Map<PluginHookMode, Set<PluginHandler>>;
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
// Janitor scripts are whole programs rather than a single handler: real ones
// run to 130k characters and iterate hundreds of lore entries, and a timeout
// discards the turn's entire script output.
const JANITOR_TIMEOUT_MS = 15_000;

function withTimeout<T>(
  p: Promise<T>,
  label: string,
  ms: number = HANDLER_TIMEOUT_MS,
): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out`)), ms),
    ),
  ]);
}

// Which ecosystem a pasted script came from, so either can be dropped in as-is:
// a Janitor script mutates a bare `context`, a Risu plugin registers handlers.
export function detectPluginKind(script: string): JsPluginKind {
  return /\bcontext\s*\./.test(script) && !/registerHandler/.test(script)
    ? "janitor"
    : "risu";
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
  // Rendered messages hold display-transformed text from the previous plugin
  // set; without dropping the cache a disabled plugin's edits stay on screen.
  invalidateJsDisplayCache();
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
    const host = new SandboxHost(
      buildPluginApi({
        registerHandler: (mode, fn) => {
          const set = handlers.get(mode) ?? new Set();
          set.add(fn);
          handlers.set(mode, set);
          // A sandbox boots asynchronously, so a display handler registers
          // after the thread has already rendered; without this the messages
          // keep their untransformed text until something else re-renders.
          if (mode === "display") invalidateJsDisplayCache();
        },
        removeHandler: (mode, fn) => {
          handlers.get(mode)?.delete(fn);
          if (mode === "display") invalidateJsDisplayCache();
        },
        getCtx: () => activeCtx,
        log: () => {},
      }),
    );
    const frame = document.createElement("iframe");
    frame.style.display = "none";
    document.body.appendChild(frame);
    const terminate = host.run(frame, code);
    instances.push({ id: row.id, name: row.name, terminate, handlers });
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

export async function runJanitorScriptsForTurn(
  snapshot: JanitorContextSnapshot,
): Promise<JanitorRunResult | null> {
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
      JANITOR_TIMEOUT_MS,
    );
    const r = rec(result);
    if (!r) return null;
    return {
      personality: String(r.personality ?? snapshot.character.personality),
      scenario: String(r.scenario ?? snapshot.character.scenario),
      example_dialogs: String(
        r.example_dialogs ?? snapshot.character.example_dialogs,
      ),
      logs: Array.isArray(r.logs) ? r.logs.map(String) : [],
    };
  } catch {
    // silent failure is the Janitor contract
    return null;
  }
}
