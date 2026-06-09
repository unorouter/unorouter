// Server-side trigger execution for the `start` event mode: runs the primary
// character's trigger scripts before assembly and surfaces their prompt-level
// outputs (system-prompt injections, var mutations, stop flag). Stateful var
// mutations ride the existing var-writeback channel; deeper mutations
// (lorebook/char CRUD) are applied to the in-memory context only for this turn.

import { parseTriggerScripts, runTriggers } from "@/lib/ai/chat/triggers/vm";
import type { TriggerContext, TriggerLore } from "@/lib/ai/chat/triggers/types";
import type { LoadedConvContext } from "@/lib/types";
import { expandMacros, type MacroScope } from "./macros";

export type StartTriggerResult = {
  // Extra system prompt to fold in (additionalSysPrompt start+historyend+promptend).
  extraSystemPrompt: string;
  // True if a trigger requested the prompt not be sent.
  stopSending: boolean;
};

export function runStartTriggers(
  convCtx: NonNullable<LoadedConvContext>,
  vars: Record<string, string>,
  globalVars: Record<string, string>,
  history: { role: "user" | "assistant" | "system"; text: string }[],
): StartTriggerResult {
  const primary = convCtx.boundCharacters[0]?.character as
    | { triggers?: unknown; name?: string }
    | undefined;
  const scripts = parseTriggerScripts(primary?.triggers);
  if (scripts.length === 0) {
    return { extraSystemPrompt: "", stopSending: false };
  }

  const lore: TriggerLore[] = convCtx.lbEntries.map((e) => ({
    id: e.id,
    comment: "",
    content: e.content,
    key: Array.isArray(e.keys) ? (e.keys as string[]).join(",") : "",
    alwaysActive: !!e.constant,
  }));

  const charName = primary?.name ?? "Assistant";
  const userName = (convCtx.persona as { name?: string })?.name ?? "User";
  const charDesc = (primary as { description?: string })?.description ?? "";
  const personaDesc =
    (convCtx.persona as { description?: string })?.description ?? "";

  // CBS expansion for operands (Risu runs risuChatParser on every effect
  // field). Shares the live var maps so {{getvar}} reads trigger writes.
  const macroScope: MacroScope = {
    user: userName,
    char: charName,
    user_description: personaDesc,
    char_description: charDesc,
    scenario: (primary as { scenario?: string })?.scenario ?? "",
    personality: (primary as { personality?: string })?.personality ?? "",
    vars,
    globalVars,
    tempVars: {},
    history,
  };

  const ctx: TriggerContext = {
    mode: "start",
    vars,
    globalVars,
    chat: history.map((h) => ({ role: h.role, data: h.text })),
    charDesc,
    personaDesc,
    authorNote: convCtx.settings.authorNote ?? "",
    replaceGlobalNote: "",
    lore,
    additionalSysPrompt: { start: "", historyend: "", promptend: "" },
    parse: (s) => (s.includes("{{") ? expandMacros(s, macroScope) : s),
    charName,
    userName,
  };

  const result = runTriggers(scripts, "start", ctx);
  const sys = [
    ctx.additionalSysPrompt.start,
    ctx.additionalSysPrompt.historyend,
    ctx.additionalSysPrompt.promptend,
  ]
    .filter(Boolean)
    .join("\n\n");

  return { extraSystemPrompt: sys, stopSending: result.stopped };
}
