// Stage 4: walk the prompt template into the message array, hoist the leading
// system run, then apply the per-model role transforms in their LOCKED order.
// Closes with the Lua editrequest hook and the #escape un-map.

import { risuUnescape } from "@/lib/ai/chat/macros";
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
  // Model auto-flags OR'd with preset manual flags (RisuAI LLMFlags parity); a
  // manual flag is never silently turned off. Computed before the system-hoist
  // so the hoist can be conditional on it.
  const autoFlags = getModelRoleFlags(model);
  const noSystemRole = assembled.flags.noSystemRole || !autoFlags.fullSystem;
  const forceAlternateRoles =
    assembled.flags.forceAlternateRoles || autoFlags.alternateRoles;
  const mustStartWithUserInput =
    assembled.flags.mustStartWithUserInput || autoFlags.userStub;
  // GLM rejects requests ending on assistant; a prefill is intentional, so it
  // suppresses the end-stub.
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

  // ORDER LOCKED, do not reshuffle:
  //  1. stripReasoningParts first: reasoning_content echoed as input is rejected (GLM).
  //  2. noSystemRole before merge: stripped system-as-user must be merge-eligible.
  //  3. prefill before merge: trailing assistant prefill collapses with an existing one (Risu parity).
  //  4. mergeAlternateRoles after prefill: strict user/assistant alternation.
  //  5. prependUserStub after merge so merge cannot fold the stub away.
  //  6. appendUserStub last (GLM "last role must be user"); skipped when a prefill is the intentional trailing assistant.
  // DeepSeek thinking-input: echo the trailing assistant turn's reasoning back
  // as reasoning_content (collected before the strip).
  const deepSeekReasoningContent = autoFlags.deepSeekThinkingInput
    ? collectTrailingReasoning(processedMessages)
    : undefined;

  processedMessages = stripReasoningParts(processedMessages);
  if (noSystemRole) processedMessages = stripSystemRole(processedMessages);
  // Drop empties BEFORE merge (RisuAI parity): dropping after merge can recreate
  // consecutive same-role messages, which strict-alternation upstreams reject.
  processedMessages = dropEmptyMessages(processedMessages);
  // The default template emits prefill as a `prefill` slot (before the
  // postHistory end inject). Only fall back to appending it when a custom
  // template dropped the card, so prefill still lands (RisuAI parity); merge
  // below folds a doubled trailing assistant.
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

  // #escape protection ends here: un-map private-use chars before upstream.
  return {
    messagesForUpstream: unescapeMessages(processedMessages),
    effectiveSystem,
    deepSeekReasoningContent,
    autoFlags,
  };
}

// Walk the assembled promptParts into a message array. Each chatHistory marker
// splices its own history slice (RisuAI multi-chat-card templates); when none
// exists, history appends at the end. Hoists the leading system run only when
// the model has a real system role (else lead=0 keeps char data in the array
// for stripSystemRole+merge).
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
