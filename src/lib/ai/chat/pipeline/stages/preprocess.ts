import { parseRegexScripts } from "@/lib/ai/chat/regex-scripts";
import {
  extractLuaCodes,
  runLuaEditTrigger,
} from "@/lib/ai/chat/triggers/lua/engine";
import {
  makeTriggerContext,
  parseTriggerScripts,
} from "@/lib/ai/chat/triggers/vm";
import type { LoadedConvContext } from "@/lib/types";
import type { AssemblerDeps } from "../deps";
import { applyRegexScripts, type StreamMessages } from "../transforms";

export type Preprocessed = {
  messages: StreamMessages;
  luaCodes: string[];
  primaryChar: { regexScripts?: unknown; triggers?: unknown } | undefined;
};

export async function preprocessMessages(
  messages: StreamMessages,
  convCtx: LoadedConvContext,
  inlinePdfText: AssemblerDeps["inlinePdfText"],
): Promise<Preprocessed> {
  const primaryChar = convCtx?.boundCharacters[0]?.character as
    { regexScripts?: unknown; triggers?: unknown } | undefined;

  const pdfInlined = await inlinePdfText(messages);
  const regexScripts = parseRegexScripts(primaryChar?.regexScripts);
  let out =
    regexScripts.length > 0
      ? applyRegexScripts(pdfInlined, regexScripts)
      : pdfInlined;

  const luaCodes = extractLuaCodes(parseTriggerScripts(primaryChar?.triggers));
  if (luaCodes.length > 0) {
    out = await applyLuaEditInput(out, luaCodes);
  }
  out = await applyJsEditInput(out);

  return { messages: out, luaCodes, primaryChar };
}

async function applyLuaEditInput(
  messages: StreamMessages,
  luaCodes: string[],
): Promise<StreamMessages> {
  let lastUserIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      lastUserIdx = i;
      break;
    }
  }
  if (lastUserIdx === -1) return messages;

  const m = messages[lastUserIdx];
  if (!Array.isArray(m.parts)) return messages;

  const editCtx = makeTriggerContext({
    mode: "input",
    vars: {},
    globalVars: {},
    chat: [],
  });
  const parts = await Promise.all(
    m.parts.map(async (p) =>
      p.type === "text" && typeof p.text === "string"
        ? {
            ...p,
            text: await runLuaEditTrigger(
              luaCodes,
              "editinput",
              editCtx,
              p.text,
            ),
          }
        : p,
    ),
  );
  return messages.map((mm, i) =>
    i === lastUserIdx ? ({ ...mm, parts } as (typeof messages)[number]) : mm,
  );
}

// JS plugin input handlers, same shape as the Lua pass: only the last user
// message's text parts. Dynamically imported so the plugin engine stays out of
// the server bundle and off first paint; no-ops when no handler is registered.
async function applyJsEditInput(
  messages: StreamMessages,
): Promise<StreamMessages> {
  if (typeof window === "undefined") return messages;
  const { hasJsHandlers, runJsEditTrigger } = await import(
    "@/lib/ai/chat/plugins/engine"
  );
  if (!hasJsHandlers("input")) return messages;

  let lastUserIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      lastUserIdx = i;
      break;
    }
  }
  if (lastUserIdx === -1) return messages;
  const m = messages[lastUserIdx];
  if (!Array.isArray(m.parts)) return messages;

  const editCtx = makeTriggerContext({
    mode: "input",
    vars: {},
    globalVars: {},
    chat: [],
  });
  const parts = await Promise.all(
    m.parts.map(async (p) =>
      p.type === "text" && typeof p.text === "string"
        ? { ...p, text: await runJsEditTrigger("input", editCtx, p.text) }
        : p,
    ),
  );
  return messages.map((mm, i) =>
    i === lastUserIdx ? ({ ...mm, parts } as (typeof messages)[number]) : mm,
  );
}
