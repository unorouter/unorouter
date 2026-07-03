// Stage 4: walk the template into messages, hoist the leading system run, apply role transforms in LOCKED order, then Lua editrequest.

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
  dropEmptyMessages,
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
  // Resolved per-model flags, reused by build-body for wire mutations.
  autoFlags: ReturnType<typeof getModelRoleFlags>;
};

export async function transformRoles(
  model: string,
  assembled: AssembledSystem,
  historyMessages: StreamMessages,
  luaCodes: string[],
): Promise<RoleTransformed> {
  // Model auto-flags OR'd with preset manual flags; a manual flag is never turned off. Computed before the system-hoist depends on it.
  const autoFlags = getModelRoleFlags(model);
  const noSystemRole = assembled.flags.noSystemRole || !autoFlags.fullSystem;
  const forceAlternateRoles =
    assembled.flags.forceAlternateRoles || autoFlags.alternateRoles;
  const mustStartWithUserInput =
    assembled.flags.mustStartWithUserInput || autoFlags.userStub;
  // GLM rejects requests ending on assistant; a prefill is intentional, so it suppresses the end-stub.
  const mustEndWithUserInput = autoFlags.endUserStub && !assembled.prefill;

  let processedMessages = walkTemplate(
    assembled,
    historyMessages,
    noSystemRole,
  );

  // Unhoisted (noSystemRole): system content lives in the messages array, so the param must be empty.
  const effectiveSystem =
    noSystemRole || assembled.system == null
      ? undefined
      : risuUnescape(assembled.system);

  // ORDER LOCKED: stripReasoningParts, noSystemRole, prefill, mergeAlternateRoles, prependUserStub, appendUserStub; each depends on the prior.
  const deepSeekReasoningContent = autoFlags.deepSeekThinkingInput
    ? collectTrailingReasoning(processedMessages)
    : undefined;

  processedMessages = stripReasoningParts(processedMessages);
  if (noSystemRole) processedMessages = stripSystemRole(processedMessages);
  // Drop empties BEFORE merge: dropping after can recreate consecutive same-role messages, which strict upstreams reject.
  processedMessages = dropEmptyMessages(processedMessages);
  // Default template emits prefill as a slot; append it only when a custom template dropped the card. Merge folds a doubled assistant.
  if (assembled.prefill && !prefillEmitted(assembled)) {
    processedMessages = appendPrefill(processedMessages, assembled.prefill);
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

  // Content-free assembly breadcrumb: template card sequence, applied flags, history in vs
  // messages out, final role order. Rides the diagnostics export; names request-shape causes
  // (dropped turns, merge collapses, card order) without any prompt text.
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

  // #escape protection ends here: un-map private-use chars before upstream.
  return {
    messagesForUpstream: unescapeMessages(processedMessages),
    effectiveSystem,
    deepSeekReasoningContent,
    autoFlags,
  };
}

// Walk promptParts into messages. Each chatHistory marker splices its slice, else history appends at the end. Hoists the system run if supported.
function walkTemplate(
  assembled: AssembledSystem,
  historyMessages: StreamMessages,
  noSystemRole: boolean,
): StreamMessages {
  const parts = assembled.promptParts;
  let lead = 0;
  if (!noSystemRole) {
    while (
      lead < parts.length &&
      parts[lead].kind === "message" &&
      (parts[lead] as { role: string }).role === "system"
    ) {
      lead++;
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
    .filter(
      (p) => p.type === "reasoning" && typeof p.text === "string" && p.text,
    )
    .map((p) => (p as { text: string }).text);
  return thoughts.length > 0 ? thoughts.join("\n") : undefined;
}

function prefillEmitted(assembled: AssembledSystem): boolean {
  return assembled.promptParts.some(
    (p) =>
      p.kind === "message" &&
      p.role === "assistant" &&
      p.text === assembled.prefill,
  );
}

// Lua listenEdit('editRequest') over the formated {role, content} array.
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
          .filter((p) => p.type === "text" && typeof p.text === "string")
          .map((p) => (p as { text: string }).text)
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
      ? ({
          ...m,
          parts: [{ type: "text", text: edited[i].content }],
        } as (typeof messages)[number])
      : m,
  );
}
