import { risuUnescape } from "@/lib/ai/chat/macros";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { runLuaEditTrigger } from "@/lib/ai/chat/triggers/lua/engine";
import { makeTriggerContext } from "@/lib/ai/chat/triggers/vm";
import type { AssembledSystem } from "../../prompt/assembler.service";
import { resolveChatRange } from "../../prompt/template";
import { getModelRoleFlags } from "../role-flags";
import {
  appendPrefill,
  appendUserStub,
  demoteLateSystem,
  dropEmptyMessages,
  dropFailedAssistantTurns,
  mergeAlternateRoles,
  mkMsg,
  prependUserStub,
  stripReasoningParts,
  stripSystemRole,
  unescapeMessages,
  type StreamMessages,
} from "../transforms";

export type RoleTransformed = {
  messagesForUpstream: StreamMessages;
  effectiveSystem: string | undefined;
  deepSeekReasoningContent: string | undefined;
  autoFlags: ReturnType<typeof getModelRoleFlags>;
};

export async function transformRoles(
  model: string,
  assembled: AssembledSystem,
  historyMessages: StreamMessages,
  luaCodes: string[],
): Promise<RoleTransformed> {
  const autoFlags = getModelRoleFlags(model);
  const noSystemRole = assembled.flags.noSystemRole || !autoFlags.fullSystem;
  const forceAlternateRoles =
    assembled.flags.forceAlternateRoles || autoFlags.alternateRoles;
  const mustStartWithUserInput =
    assembled.flags.mustStartWithUserInput || autoFlags.userStub;
  const mustEndWithUserInput = autoFlags.endUserStub && !assembled.prefill;

  let processedMessages = walkTemplate(
    assembled,
    historyMessages,
    noSystemRole,
  );

  const effectiveSystem =
    noSystemRole || assembled.system == null
      ? undefined
      : risuUnescape(assembled.system);

  const deepSeekReasoningContent = autoFlags.deepSeekThinkingInput
    ? collectTrailingReasoning(processedMessages)
    : undefined;

  const prefillText = openThinkForPrefill(
    assembled.prefill,
    autoFlags.prefillOpensThink,
  );

  processedMessages = dropFailedAssistantTurns(processedMessages);
  processedMessages = stripReasoningParts(processedMessages);
  if (noSystemRole) processedMessages = stripSystemRole(processedMessages);
  processedMessages = demoteLateSystem(processedMessages);
  processedMessages = dropEmptyMessages(processedMessages);
  if (prefillText && !prefillEmitted(assembled)) {
    processedMessages = appendPrefill(processedMessages, prefillText);
  } else if (prefillText && prefillText !== assembled.prefill) {
    processedMessages = retagEmittedPrefill(
      processedMessages,
      assembled.prefill!,
      prefillText,
    );
  }
  if (forceAlternateRoles)
    processedMessages = mergeAlternateRoles(processedMessages);
  if (mustStartWithUserInput)
    processedMessages = prependUserStub(processedMessages);
  if (mustEndWithUserInput)
    processedMessages = appendUserStub(processedMessages);

  if (luaCodes.length > 0) {
    processedMessages = await applyLuaEditRequest(processedMessages, luaCodes);
  }
  processedMessages = await applyJsEditRequest(processedMessages);

  logChatDebug("assembly.shape", {
    model,
    flags: {
      noSystemRole,
      forceAlternateRoles,
      mustStartWithUserInput,
      mustEndWithUserInput,
    },
    cards: assembled.promptParts
      .map((p) => (p.kind === "message" ? p.role[0] : "H"))
      .join(""),
    historyIn: historyMessages.length,
    systemHoisted: effectiveSystem != null,
    prefill: !!assembled.prefill,
    rolesOut: processedMessages.map((m) => m.role).join(","),
  });

  return {
    messagesForUpstream: unescapeMessages(processedMessages),
    effectiveSystem,
    deepSeekReasoningContent,
    autoFlags,
  };
}

function walkTemplate(
  assembled: AssembledSystem,
  historyMessages: StreamMessages,
  noSystemRole: boolean,
): StreamMessages {
  const parts = assembled.promptParts;
  let lead = 0;
  if (!noSystemRole) {
    for (; lead < parts.length; lead++) {
      const p = parts[lead];
      if (p.kind !== "message" || p.role !== "system") break;
    }
  }
  const out: StreamMessages = [];
  let hadChat = false;
  for (let i = lead; i < parts.length; i++) {
    const p = parts[i];
    if (p.kind === "message") {
      out.push(mkMsg(p.role, p.text));
      continue;
    }
    hadChat = true;
    const range = resolveChatRange(
      p.rangeStart,
      p.rangeEnd,
      historyMessages.length,
    );
    out.push(...historyMessages.slice(range.start, range.end));
  }
  if (!hadChat) out.push(...historyMessages);
  return out;
}

function collectTrailingReasoning(
  messages: StreamMessages,
): string | undefined {
  const last = messages[messages.length - 1];
  if (last?.role !== "assistant" || !Array.isArray(last.parts))
    return undefined;
  const thoughts = last.parts
    .filter((p) => p.type === "reasoning")
    .map((p) => p.text)
    .filter((t) => typeof t === "string" && t.length > 0);
  return thoughts.length > 0 ? thoughts.join("\n") : undefined;
}

// Reopen the reasoning block on the prefill so the model resumes thinking instead of answering
// straight away (see prefillOpensThink). Applied to the prefill STRING, before it is appended, so
// that a doubled trailing assistant folding into one message during mergeAlternateRoles keeps the
// tag attached to the prefill segment rather than to the whole merged turn. Left alone when the
// text already opens one: that is the hand-written shape prefillThinkMiddleware was built for.
function openThinkForPrefill(
  prefill: string | undefined,
  enabled: boolean,
): string | undefined {
  if (!prefill || !enabled) return prefill;
  const open = prefill.lastIndexOf("<think>");
  if (open !== -1 && !prefill.includes("</think>", open)) return prefill;
  return `<think>\n${prefill}`;
}

// The prefill can also reach the message list as a template card emitted by walkTemplate, which
// skips appendPrefill entirely. Retag that card so the tag lands whichever way the prefill arrived.
// Matches the LAST assistant message carrying the raw prefill text, since that is the trailing turn
// the model continues from.
function retagEmittedPrefill(
  messages: StreamMessages,
  rawPrefill: string,
  tagged: string,
): StreamMessages {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant" || !Array.isArray(m.parts)) continue;
    const idx = m.parts.findIndex(
      (p) => p.type === "text" && p.text === rawPrefill,
    );
    if (idx === -1) continue;
    const parts = m.parts.map((p, j) =>
      j === idx ? { ...p, text: tagged } : p,
    );
    return messages.map((msg, j) => (j === i ? { ...msg, parts } : msg));
  }
  return messages;
}

function prefillEmitted(assembled: AssembledSystem): boolean {
  return assembled.promptParts.some(
    (p) =>
      p.kind === "message" &&
      p.role === "assistant" &&
      p.text === assembled.prefill,
  );
}

async function applyLuaEditRequest(
  messages: StreamMessages,
  luaCodes: string[],
): Promise<StreamMessages> {
  const editCtx = makeTriggerContext({
    mode: "request",
    vars: {},
    globalVars: {},
    chat: [],
  });
  const formated = messages.map((m) => ({
    role: m.role,
    content: Array.isArray(m.parts)
      ? m.parts
          .filter((p) => p.type === "text")
          .map((p) => p.text)
          .join("\n")
      : "",
  }));
  const edited = await runLuaEditTrigger(
    luaCodes,
    "editrequest",
    editCtx,
    formated,
  );
  if (!Array.isArray(edited) || edited.length !== formated.length)
    return messages;
  return messages.map((m, i) =>
    edited[i] &&
    typeof edited[i].content === "string" &&
    edited[i].content !== formated[i].content
      ? { ...m, parts: [{ type: "text" as const, text: edited[i].content }] }
      : m,
  );
}

// JS plugin request handlers over the same flattened {role, content}[] the Lua
// pass uses, with the same length guard. Dynamically imported so the plugin
// engine stays out of the server bundle; no-ops without registered handlers.
async function applyJsEditRequest(
  messages: StreamMessages,
): Promise<StreamMessages> {
  if (typeof window === "undefined") return messages;
  const { hasJsHandlers, runJsEditTrigger } =
    await import("@/lib/ai/chat/plugins/engine");
  if (!hasJsHandlers("request")) return messages;

  const editCtx = makeTriggerContext({
    mode: "request",
    vars: {},
    globalVars: {},
    chat: [],
  });
  const formated = messages.map((m) => ({
    role: m.role,
    content: Array.isArray(m.parts)
      ? m.parts
          .filter((p) => p.type === "text")
          .map((p) => p.text)
          .join("\n")
      : "",
  }));
  const edited = await runJsEditTrigger("request", editCtx, formated);
  if (!Array.isArray(edited) || edited.length !== formated.length)
    return messages;
  return messages.map((m, i) =>
    edited[i] &&
    typeof edited[i].content === "string" &&
    edited[i].content !== formated[i].content
      ? { ...m, parts: [{ type: "text" as const, text: edited[i].content }] }
      : m,
  );
}
