import { parseRegexScripts } from "@/lib/ai/chat/regex-scripts";
import { hasJsHandlers, runJsEditTrigger } from "@/lib/ai/chat/plugins/engine";
import {
  extractLuaCodes,
  runLuaEditTrigger,
} from "@/lib/ai/chat/triggers/lua/engine";
import {
  makeTriggerContext,
  parseTriggerScripts,
} from "@/lib/ai/chat/triggers/vm";
import type { TriggerContext } from "@/lib/ai/chat/triggers/types";
import type { LoadedConvContext } from "@/lib/types";
import type { AssemblerDeps } from "../deps";
import { applyRegexScripts, type StreamMessages } from "../transforms";

export type Preprocessed = {
  messages: StreamMessages;
  luaCodes: string[];
};

export async function preprocessMessages(
  messages: StreamMessages,
  convCtx: LoadedConvContext,
  inlinePdfText: AssemblerDeps["inlinePdfText"],
): Promise<Preprocessed> {
  const primaryChar = convCtx?.boundCharacters[0]?.character;

  const pdfInlined = await inlinePdfText(messages);
  const regexScripts = parseRegexScripts(primaryChar?.regexScripts);
  let out =
    regexScripts.length > 0
      ? applyRegexScripts(pdfInlined, regexScripts)
      : pdfInlined;

  const luaCodes = extractLuaCodes(parseTriggerScripts(primaryChar?.triggers));
  if (luaCodes.length > 0) {
    out = await applyEditInput(out, (ctx, text) =>
      runLuaEditTrigger(luaCodes, "editinput", ctx, text),
    );
  }
  if (hasJsHandlers("input")) {
    out = await applyEditInput(out, (ctx, text) =>
      runJsEditTrigger("input", ctx, text),
    );
  }

  return { messages: out, luaCodes };
}

// Only the last user message's text parts are editable.
async function applyEditInput(
  messages: StreamMessages,
  edit: (ctx: TriggerContext, text: string) => Promise<string>,
): Promise<StreamMessages> {
  const lastUserIdx = messages.findLastIndex((m) => m.role === "user");
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
        ? { ...p, text: await edit(editCtx, p.text) }
        : p,
    ),
  );
  return messages.map((mm, i) => (i === lastUserIdx ? { ...mm, parts } : mm));
}
