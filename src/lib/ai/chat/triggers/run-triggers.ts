import {
  makeTriggerContext,
  parseTriggerScripts,
  runTriggers,
} from "@/lib/ai/chat/triggers/vm";
import type { TriggerLore, TriggerOps } from "@/lib/ai/chat/triggers/types";
import type { LoadedConvContext } from "@/lib/types";
import { expandMacros, type MacroScope } from "@/lib/ai/chat/macros";

export type StartTriggerResult = {
  extraSystemPrompt: string;
  stopSending: boolean;
  alerts: { kind: string; text: string }[];
};

export async function runStartTriggers(
  convCtx: NonNullable<LoadedConvContext>,
  vars: Record<string, string>,
  globalVars: Record<string, string>,
  history: { role: "user" | "assistant" | "system"; text: string }[],
  ops?: TriggerOps,
): Promise<StartTriggerResult> {
  const primary = convCtx.boundCharacters[0]?.character;
  const scripts = parseTriggerScripts(primary?.triggers);
  if (scripts.length === 0) {
    return { extraSystemPrompt: "", stopSending: false, alerts: [] };
  }

  const lore: TriggerLore[] = convCtx.lbEntries.map((e) => ({
    id: e.id,
    comment: "",
    content: e.content,
    key: e.keys.join(","),
    alwaysActive: !!e.constant,
  }));

  const charName = primary?.name ?? "Assistant";
  const userName = convCtx.persona?.name ?? "User";
  const charDesc = primary?.description ?? "";
  const personaDesc = convCtx.persona?.description ?? "";

  const macroScope: MacroScope = {
    user: userName,
    char: charName,
    user_description: personaDesc,
    char_description: charDesc,
    scenario: primary?.scenario ?? "",
    personality: primary?.personality ?? "",
    vars,
    globalVars,
    tempVars: {},
    history,
  };

  const serverAlerts: { kind: string; text: string }[] = [];
  const wrappedOps: TriggerOps = {
    ...ops,
    alert: async (kind, text) => {
      if (kind === "normal" || kind === "error") {
        serverAlerts.push({ kind, text });
        return "";
      }
      return "";
    },
  };

  const ctx = makeTriggerContext({
    mode: "start",
    vars,
    globalVars,
    chat: history.map((h) => ({ role: h.role, data: h.text })),
    charDesc,
    personaDesc,
    authorNote: convCtx.settings.authorNote ?? "",
    lore,
    parse: (s) => (s.includes("{{") ? expandMacros(s, macroScope) : s),
    charName,
    userName,
    ops: wrappedOps,
  });

  ctx.ops = {
    ...ctx.ops,
    runLua: async (code) => {
      const { runScripted } = await import("@/lib/ai/chat/triggers/lua/engine");
      await runScripted({
        code,
        mode: "start",
        ctx,
        lowLevelAccess: !!ctx.lowLevelAccess,
      });
    },
  };
  const result = await runTriggers(scripts, "start", ctx);
  const sys = [
    ctx.additionalSysPrompt.start,
    ctx.additionalSysPrompt.historyend,
    ctx.additionalSysPrompt.promptend,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    extraSystemPrompt: sys,
    stopSending: result.stopped || !!ctx.stopSending,
    alerts: serverAlerts,
  };
}
