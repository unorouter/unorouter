    // Stage 2: pre-assembly message edits. PDF inline, primary-character regex scripts (editprocess/editinput), and the Lua editinput hook on the last user message.

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
import {
  applyRegexScripts,
  inlinePdfText,
  type StreamMessages,
} from "../transforms";

export type Preprocessed = {
  messages: StreamMessages;
  luaCodes: string[];
  primaryChar: { regexScripts?: unknown; triggers?: unknown } | undefined;
};

export async function preprocessMessages(
  messages: StreamMessages,
  convCtx: LoadedConvContext,
): Promise<Preprocessed> {
  const primaryChar = convCtx?.boundCharacters[0]?.character as
    | { regexScripts?: unknown; triggers?: unknown }
    | undefined;

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

  return { messages: out, luaCodes, primaryChar };
}

// Lua listenEdit('editInput') on the last user message (Risu edit pipeline).
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
