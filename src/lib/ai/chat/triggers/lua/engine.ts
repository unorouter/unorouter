// wasmoon Lua engine (RisuAI scriptings.ts port): engine-per-mode, mutex'd,
// recreated when the script code changes. Entry points mirror Risu: onStart/
// onInput/onOutput(accessKey) for trigger modes, callListenMain for the
// listenEdit() edit pipeline. Isomorphic: json.lua loads via fetch in the
// browser and fs on the server; wasmoon itself is a lazy dynamic import.

import type { TriggerContext } from "../types";
import { buildLuaApi } from "./api";

type LuaEngineLike = {
  global: {
    set: (name: string, value: unknown) => void;
    get: (name: string) => unknown;
    close: () => void;
  };
  doString: (code: string) => Promise<unknown>;
};

type EngineState = {
  engine?: LuaEngineLike;
  code?: string;
  queue: Promise<unknown>;
};

// Access-key gating (Risu ScriptingSafeIds): API calls carry the key of the
// active run; stale callbacks from a previous run are ignored.
export const luaSafeIds = new Set<string>();
export const luaEditDisplayIds = new Set<string>();
export const luaLowLevelIds = new Set<string>();

let factoryPromise: Promise<unknown> | null = null;
const engines = new Map<string, EngineState>();

async function loadJsonLua(): Promise<string> {
  if (typeof window === "undefined") {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    return readFile(join(process.cwd(), "public", "lua", "json.lua"), "utf-8");
  }
  const res = await fetch("/lua/json.lua");
  return res.ok ? res.text() : "";
}

async function getFactory(): Promise<unknown> {
  if (!factoryPromise) {
    factoryPromise = (async () => {
      const { LuaFactory } = await import("wasmoon");
      const factory = new LuaFactory();
      await factory.mountFile("json.lua", await loadJsonLua());
      return factory;
    })();
  }
  return factoryPromise;
}

function getState(mode: string): EngineState {
  let s = engines.get(mode);
  if (!s) {
    s = { queue: Promise.resolve() };
    engines.set(mode, s);
  }
  return s;
}

// Risu luaCodeWrapper: json helpers, state helpers, listenEdit registries,
// coroutine-safe async wrapper, callListenMain dispatcher.
function luaCodeWrapper(code: string): string {
  return `
json = require 'json'

function getChat(id, index)
    return json.decode(getChatMain(id, index))
end

function getFullChat(id)
    return json.decode(getFullChatMain(id))
end

function setFullChat(id, value)
    setFullChatMain(id, json.encode(value))
end

function log(value)
    logMain(json.encode(value))
end

function getLoreBooks(id, search)
    return json.decode(getLoreBooksMain(id, search))
end

function loadLoreBooks(id)
    return json.decode(loadLoreBooksMain(id):await())
end

function LLM(id, prompt, useMultimodal, options)
    useMultimodal = useMultimodal or false
    options = options or {}
    return json.decode(LLMMain(id, json.encode(prompt), useMultimodal, json.encode(options)):await())
end

function axLLM(id, prompt, useMultimodal, options)
    useMultimodal = useMultimodal or false
    options = options or {}
    return json.decode(axLLMMain(id, json.encode(prompt), useMultimodal, json.encode(options)):await())
end

function getCharacterImage(id)
    return getCharacterImageMain(id):await()
end

function getPersonaImage(id)
    return getPersonaImageMain(id):await()
end

local editRequestFuncs = {}
local editDisplayFuncs = {}
local editInputFuncs = {}
local editOutputFuncs = {}

function listenEdit(type, func)
    if type == 'editRequest' then
        editRequestFuncs[#editRequestFuncs + 1] = func
        return
    end

    if type == 'editDisplay' then
        editDisplayFuncs[#editDisplayFuncs + 1] = func
        return
    end

    if type == 'editInput' then
        editInputFuncs[#editInputFuncs + 1] = func
        return
    end

    if type == 'editOutput' then
        editOutputFuncs[#editOutputFuncs + 1] = func
        return
    end

    throw('Invalid type')
end

function getState(id, name)
    local escapedName = "__"..name
    return json.decode(getChatVar(id, escapedName))
end

function setState(id, name, value)
    local escapedName = "__"..name
    setChatVar(id, escapedName, json.encode(value))
end

function async(callback)
    return function(...)
        local co = coroutine.create(callback)
        local safe, result = coroutine.resume(co, ...)

        return Promise.create(function(resolve, reject)
            local checkresult
            local step = function()
                if coroutine.status(co) == "dead" then
                    local send = safe and resolve or reject
                    return send(result)
                end

                safe, result = coroutine.resume(co)
                checkresult()
            end

            checkresult = function()
                if safe and result == Promise.resolve(result) then
                    result:finally(step)
                else
                    step()
                end
            end

            checkresult()
        end)
    end
end

callListenMain = async(function(type, id, value, meta)
    local realValue = json.decode(value)
    local realMeta = json.decode(meta)

    if type == 'editRequest' then
        for _, func in ipairs(editRequestFuncs) do
            realValue = func(id, realValue, realMeta)
        end
    end

    if type == 'editDisplay' then
        for _, func in ipairs(editDisplayFuncs) do
            realValue = func(id, realValue, realMeta)
        end
    end

    if type == 'editInput' then
        for _, func in ipairs(editInputFuncs) do
            realValue = func(id, realValue, realMeta)
        end
    end

    if type == 'editOutput' then
        for _, func in ipairs(editOutputFuncs) do
            realValue = func(id, realValue, realMeta)
        end
    end

    return json.encode(realValue)
end)

${code}
`;
}

export type RunScriptedArgs = {
  code: string;
  // Risu mode names: start/input/output + editRequest/editInput/editOutput/editDisplay.
  mode: string;
  ctx: TriggerContext;
  lowLevelAccess: boolean;
  data?: unknown;
  meta?: object;
};

export type RunScriptedResult = {
  res: unknown;
  stopSending: boolean;
};

export async function runScripted(
  args: RunScriptedArgs,
): Promise<RunScriptedResult> {
  const state = getState(args.mode);
  // Mutex: chain on the per-mode queue (Risu runExclusive).
  const run = state.queue.then(async (): Promise<RunScriptedResult> => {
    const flags = { stopSending: false };
    if (args.code !== state.code) {
      state.engine?.global.close();
      const factory = (await getFactory()) as {
        createEngine: (o: object) => Promise<LuaEngineLike>;
      };
      state.engine = await factory.createEngine({ injectObjects: true });
      const api = buildLuaApi(args.ctx, flags);
      for (const [name, fn] of Object.entries(api)) {
        state.engine.global.set(name, fn);
      }
      await state.engine.doString(luaCodeWrapper(args.code));
      state.code = args.code;
    } else if (state.engine) {
      // Rebind: the API closures must see THIS run's context.
      const api = buildLuaApi(args.ctx, flags);
      for (const [name, fn] of Object.entries(api)) {
        state.engine.global.set(name, fn);
      }
    }
    const engine = state.engine;
    if (!engine) return { res: undefined, stopSending: false };

    const accessKey = crypto.randomUUID();
    if (args.mode === "editDisplay") luaEditDisplayIds.add(accessKey);
    else {
      luaSafeIds.add(accessKey);
      if (args.lowLevelAccess) luaLowLevelIds.add(accessKey);
    }
    try {
      let res: unknown;
      if (
        args.mode === "start" ||
        args.mode === "input" ||
        args.mode === "output"
      ) {
        const entry = {
          start: "onStart",
          input: "onInput",
          output: "onOutput",
        }[args.mode];
        const func = engine.global.get(entry) as
          | ((key: string) => Promise<unknown>)
          | undefined;
        if (func) res = await func(accessKey);
      } else if (args.mode.startsWith("edit")) {
        const func = engine.global.get("callListenMain") as
          | ((
              mode: string,
              key: string,
              data: string,
              meta: string,
            ) => Promise<string>)
          | undefined;
        if (func) {
          const raw = await func(
            args.mode,
            accessKey,
            JSON.stringify(args.data ?? null),
            JSON.stringify(args.meta ?? {}),
          );
          try {
            res = JSON.parse(raw);
          } catch {
            res = undefined;
          }
        }
      }
      return { res, stopSending: flags.stopSending };
    } finally {
      luaSafeIds.delete(accessKey);
      luaEditDisplayIds.delete(accessKey);
      luaLowLevelIds.delete(accessKey);
    }
  });
  // Keep the chain alive on failure.
  state.queue = run.catch(() => undefined);
  return run;
}

// Trigger scripts whose first effect is triggerlua carry the Lua program
// (Risu runLuaEditTrigger collection rule).
export function extractLuaCodes(
  scripts: { effect: { type: string; code?: unknown }[] }[],
): string[] {
  const out: string[] = [];
  for (const s of scripts) {
    const e = s.effect?.[0];
    if (e?.type === "triggerlua" && typeof e.code === "string" && e.code) {
      out.push(e.code);
    }
  }
  return out;
}

// Risu runLuaEditTrigger: feed content through every triggerlua script's
// listenEdit handlers for the given edit mode. Errors return content untouched.
export async function runLuaEditTrigger<T>(
  luaCodes: string[],
  mode: "editinput" | "editoutput" | "editdisplay" | "editrequest",
  ctx: TriggerContext,
  content: T,
): Promise<T> {
  const editMode = {
    editinput: "editInput",
    editoutput: "editOutput",
    editdisplay: "editDisplay",
    editrequest: "editRequest",
  }[mode];
  let data: unknown = content;
  try {
    for (const code of luaCodes) {
      const result = await runScripted({
        code,
        mode: editMode,
        ctx,
        lowLevelAccess: false,
        data,
      });
      data = result.res ?? data;
    }
    return data as T;
  } catch {
    return content;
  }
}
