    // Trigger VM: RisuAI runTrigger port over the flat effect[] layout. A block at indent N closes at a v2EndIndent of N+1. lowLevelAccess side effects are no-ops here.

import { runDataOpcode, type VarResolver } from "./opcodes";
import type {
  TriggerCondition,
  TriggerContext,
  TriggerEffect,
  TriggerEventMode,
  TriggerRunResult,
  TriggerScript,
} from "./types";

const MAX_STEPS = 100000; // runaway-loop backstop

// Pure-op subset allowed in the sandboxed display/request modes.
const SAFE_SUBSET = new Set([
  "v2SetVar",
  "v2If",
  "v2IfAdvanced",
  "v2Else",
  "v2EndIndent",
  "v2Loop",
  "v2LoopNTimes",
  "v2BreakLoop",
  "v2ConsoleLog",
  "v2StopTrigger",
  "v2Random",
  "v2ExtractRegex",
  "v2RegexTest",
  "v2ReplaceString",
  "v2GetCharAt",
  "v2GetCharCount",
  "v2SetCharAt",
  "v2ToLowerCase",
  "v2ToUpperCase",
  "v2SplitString",
  "v2JoinArrayVar",
  "v2ConcatString",
  "v2MakeArrayVar",
  "v2GetArrayVarLength",
  "v2GetArrayVar",
  "v2SetArrayVar",
  "v2PushArrayVar",
  "v2PopArrayVar",
  "v2ShiftArrayVar",
  "v2UnshiftArrayVar",
  "v2SpliceArrayVar",
  "v2SliceArrayVar",
  "v2GetIndexOfValueInArrayVar",
  "v2RemoveIndexFromArrayVar",
  "v2Calculate",
  "v2Comment",
  "v2DeclareLocalVar",
  "v2MakeDictVar",
  "v2GetDictVar",
  "v2SetDictVar",
  "v2DeleteDictKey",
  "v2HasDictKey",
  "v2ClearDict",
  "v2GetDictSize",
  "v2GetDictKeys",
  "v2GetDictValues",
]);
    // V1 lowLevelAccess effects: allowed in ANY mode when the script carries the flag (Risu gates only on lowLevelAccess).
const V1_LOW_LEVEL = new Set([
  "runLLM",
  "sendAIprompt",
  "checkSimilarity",
  "extractRegex",
  "runImgGen",
  "showAlert",
  "triggerlua",
]);

const DISPLAY_EXTRA = new Set(["v2GetDisplayState", "v2SetDisplayState"]);
const REQUEST_EXTRA = new Set([
  "v2GetRequestState",
  "v2SetRequestState",
  "v2GetRequestStateRole",
  "v2SetRequestStateRole",
  "v2GetRequestStateLength",
]);

function opcodeAllowed(
  type: string,
  mode: TriggerEventMode,
  lowLevelAccess: boolean,
): boolean {
  if (V1_LOW_LEVEL.has(type)) return lowLevelAccess;
  if (mode === "display")
    return SAFE_SUBSET.has(type) || DISPLAY_EXTRA.has(type);
  if (mode === "request")
    return SAFE_SUBSET.has(type) || REQUEST_EXTRA.has(type);
  return true;
}

type Resolver = VarResolver & {
  declareLocal: (name: string, value: string, indent: number) => void;
  dropAtOrAbove: (indent: number) => void;
  setIndent: (indent: number) => void;
};

    // Indent-scoped local var resolution (Risu port). Lookup order: locals, chat vars, global vars, defaultVars, 'null'. Display mode redirects chat-var writes to a scratch map.
function makeResolver(ctx: TriggerContext): Resolver {
  const locals: Record<number, Record<string, string>> = {};
  const displayScratch: Record<string, string> = {};
  let curIndent = 0;
  const findLocal = (name: string): number | null => {
    for (let i = curIndent; i >= 0; i--) {
      if (locals[i] && name in locals[i]) return i;
    }
    return null;
  };
  return {
    get(name) {
      const li = findLocal(name);
      if (li !== null) return locals[li][name];
      if (ctx.mode === "display" && name in displayScratch)
        return displayScratch[name];
      if (name in ctx.vars) return ctx.vars[name];
      if (name in ctx.globalVars) return ctx.globalVars[name];
      if (ctx.defaultVars && name in ctx.defaultVars)
        return ctx.defaultVars[name];
      return "null";
    },
    set(name, value) {
      const li = findLocal(name);
      if (li !== null) {
        locals[li][name] = value;
        return;
      }
      if (ctx.mode === "display") {
        displayScratch[name] = value;
        return;
      }
      ctx.vars[name] = value;
    },
    declareLocal(name, value, indent) {
      (locals[indent] ??= {})[name] = value;
    },
    dropAtOrAbove(indent) {
      for (const k of Object.keys(locals)) {
        if (Number(k) >= indent) delete locals[Number(k)];
      }
    },
    setIndent(indent) {
      curIndent = indent;
    },
  };
}

// CBS-expand via the context's parser when present (risuChatParser analog).
const mkParse =
  (ctx: TriggerContext) =>
  (s: unknown): string =>
    ctx.parse ? ctx.parse(String(s ?? "")) : String(s ?? "");

// Numeric-aware equality: 1.0 == 1, falls back to string compare (Risu =/!=).
function numEq(a: string, b: string): boolean {
  const na = Number(a);
  const nb = Number(b);
  return !Number.isNaN(na) && !Number.isNaN(nb) ? na === nb : a === b;
}

function evalCondition(
  c: TriggerCondition,
  ctx: TriggerContext,
  vr: VarResolver,
): boolean {
  const parse = mkParse(ctx);
  if (c.type === "exists") {
    // Risu joins the slice once and searches the joined text.
    const da = ctx.chat
      .slice(0 - (c.depth || 10))
      .map((m) => m.data)
      .join(" ");
    const val = parse(c.value);
    if (c.type2 === "regex") {
      try {
        return new RegExp(val).test(da);
      } catch {
        return false;
      }
    }
    if (c.type2 === "strict") return da.split(" ").includes(val);
    return da.toLowerCase().includes(val.toLowerCase());
  }
  const left =
    c.type === "chatindex"
      ? String(ctx.chat.length)
      : c.type === "var"
        ? vr.get(parse(c.var))
        : parse(c.var);
  const right = parse(c.value);
  switch (c.operator) {
    case "=":
      return left === right;
    case "!=":
      return left !== right;
    case ">":
      return Number(left) > Number(right);
    case "<":
      return Number(left) < Number(right);
    case ">=":
      return Number(left) >= Number(right);
    case "<=":
      return Number(left) <= Number(right);
    case "null":
      return left === "null";
    case "true":
      // Risu: only 'true' and '1' are truthy.
      return left === "true" || left === "1";
    default:
      return false;
  }
}

    // Plain v2If's source is a var name; v2IfAdvanced honors sourceType. Targets are var lookups unless targetType is 'value'. =/!= numeric-aware.
function evalIf(
  e: TriggerEffect,
  ctx: TriggerContext,
  vr: VarResolver,
): boolean {
  const parse = mkParse(ctx);
  const a =
    e.type === "v2If" || e.sourceType === "var"
      ? vr.get(parse(e.source))
      : parse(e.source);
  const b =
    e.targetType === "value" ? parse(e.target) : vr.get(parse(e.target));
  // Older/non-Risu data may carry `operator` instead of `condition`.
  const op = (e.condition ?? e.operator) as string | undefined;
  switch (op) {
    case "=":
      return numEq(a, b);
    case "!=":
      return !numEq(a, b);
    case ">":
      return Number(a) > Number(b);
    case "<":
      return Number(a) < Number(b);
    case ">=":
      return Number(a) >= Number(b);
    case "<=":
      return Number(a) <= Number(b);
    case "∈":
      return parseList(b).includes(a);
    case "∉":
      return !parseList(b).includes(a);
    case "∋":
      return parseList(a).includes(b);
    case "∌":
      return !parseList(a).includes(b);
    case "≒": {
      const na = Number(a);
      const nb = Number(b);
      if (Number.isNaN(na) || Number.isNaN(nb)) {
        return (
          a.toLowerCase().replace(/ /g, "") ===
          b.toLowerCase().replace(/ /g, "")
        );
      }
      return Math.abs(na - nb) < 0.0001;
    }
    case "≡": {
      if (b === "true") return a === "true" || a === "1";
      if (b === "false") return !(a === "true" || a === "1");
      return a === b;
    }
    default:
      return false;
  }
}

function parseList(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return s.split(",").map((x) => x.trim());
  }
}

    // Run one script's effects against the context. Control flow mirrors the Risu interpreter: direct index jumps over the flat effect array.
async function runEffects(
  script: TriggerScript,
  ctx: TriggerContext,
): Promise<void> {
  const vr = makeResolver(ctx);
  const eff = script.effect;
  let steps = 0;
  // Per-EndIndent LoopNTimes iteration counters (Risu tempVars[idx+'LoopNTimes']).
  const loopCounts: Record<number, number> = {};
  const parse = mkParse(ctx);
  // Operand resolution: explicit 'value' is a literal, default is a var lookup.
  const resolve = (value: unknown, valueType: unknown): string =>
    valueType === "value" ? parse(value) : vr.get(parse(value));
      // Index of the block-closing v2EndIndent at bodyIndent; effect end when missing (malformed data degrades to a skip-out).
  const findEnd = (from: number, bodyIndent: number): number => {
    for (let j = from; j < eff.length; j++) {
      const ef = eff[j];
      if (ef?.type === "v2EndIndent" && (ef.indent ?? 0) === bodyIndent)
        return j;
    }
    return eff.length;
  };

  for (let i = 0; i < eff.length; i++) {
    if (++steps > MAX_STEPS) break;
    const e = eff[i];
    if (!e) continue;

    const indent = typeof e.indent === "number" && e.indent >= 0 ? e.indent : 0;
    vr.setIndent(indent);

    if (!opcodeAllowed(e.type, ctx.mode, !!ctx.lowLevelAccess)) continue;

    switch (e.type) {
      case "v2StopTrigger":
        return;
      case "extractRegex": {
        const v = parse(e.value);
        let m: RegExpExecArray | null = null;
        try {
          m = new RegExp(parse(e.regex), parse(e.flags)).exec(v);
        } catch {
          m = null;
        }
        // $N capture groups, $& full match, $$ literal; no match -> empties.
        const outv = parse(e.result).replace(
          /\$(\d+|&|\$)/g,
          (_whole, g: string) => {
            if (g === "$") return "$";
            if (g === "&") return m?.[0] ?? "";
            return m?.[Number(g)] ?? "";
          },
        );
        if (e.inputVar) vr.set(parse(e.inputVar), outv);
        continue;
      }
      case "checkSimilarity": {
        const source = parse(e.source);
        const values = parse(e.value).split("\u00a7");
        let outv = "Error: similarity unsupported";
        if (ctx.ops?.similarity) {
          try {
            outv = (await ctx.ops.similarity(source, values)).join("\u00a7");
          } catch (err) {
            outv = "Error: " + String(err);
          }
        }
        if (e.inputVar) vr.set(parse(e.inputVar), outv);
        continue;
      }
      case "runLLM": {
        let outv = "Error: LLM unsupported";
        if (ctx.ops?.runLLM) {
          try {
            outv = await ctx.ops.runLLM(parse(e.value));
          } catch (err) {
            outv = "Error: " + String(err);
          }
        }
        if (e.inputVar) vr.set(parse(e.inputVar), outv);
        continue;
      }
      case "runImgGen": {
        let outv = "Error: Image generation failed";
        if (ctx.ops?.imgGen) {
          try {
            outv = await ctx.ops.imgGen(parse(e.value), parse(e.negValue));
          } catch {
            outv = "Error: Image generation failed";
          }
        }
        if (e.inputVar) vr.set(parse(e.inputVar), outv);
        continue;
      }
      case "showAlert": {
        const kind = (e.alertType ?? "normal") as
          | "normal"
          | "error"
          | "input"
          | "select";
        const text = parse(e.value);
        let outv = "";
        if (ctx.ops?.alert) {
          try {
            outv = await ctx.ops.alert(
              kind,
              text,
              kind === "select" ? text.split("\u00a7") : undefined,
            );
          } catch {
            outv = "";
          }
        }
        if ((kind === "input" || kind === "select") && e.inputVar) {
          vr.set(parse(e.inputVar), outv);
        }
        continue;
      }
      case "sendAIprompt":
        ctx.sendAIprompt = true;
        continue;
      case "triggerlua": {
        if (ctx.ops?.runLua) {
          try {
            await ctx.ops.runLua(String(e.code ?? ""));
          } catch {
            // Risu surfaces Lua errors as console noise only.
          }
        }
        continue;
      }
      case "v2DeclareLocalVar":
        vr.declareLocal(parse(e.var), resolve(e.value, e.valueType), indent);
        continue;
      case "v2If":
      case "v2IfAdvanced": {
        if (!evalIf(e, ctx, vr)) {
              // Skip to this block's EndIndent; if this if's v2Else follows, step past it so the else body runs.
          i = findEnd(i + 1, indent + 1);
          const next = eff[i + 1];
          if (next?.type === "v2Else" && (next.indent ?? 0) === indent) i++;
        }
        continue;
      }
      case "v2Else":
        // Reached after a TRUE if-body ran: skip the else body to its end.
        i = findEnd(i + 1, indent + 1);
        continue;
      case "v2Loop":
      case "v2LoopNTimes":
        // Looping is handled at the closing v2EndIndent (endOfLoop).
        continue;
      case "v2BreakLoop": {
        // Jump to the next loop-closing EndIndent; the for-loop steps past it.
        for (i = i + 1; i < eff.length; i++) {
          if (eff[i]?.type === "v2EndIndent" && eff[i].endOfLoop === true) {
            break;
          }
        }
        continue;
      }
      case "v2EndIndent": {
        if (e.endOfLoop === true) {
          const loopIndent = indent - 1;
          const endIdx = i;
          // Scan backward for the owning v2Loop / v2LoopNTimes.
          for (let j = i - 1; j >= 0; j--) {
            const ef = eff[j];
            if (
              (ef?.type === "v2Loop" || ef?.type === "v2LoopNTimes") &&
              (ef.indent ?? 0) === loopIndent
            ) {
              if (ef.type === "v2LoopNTimes") {
                let n = Number(resolve(ef.value, ef.valueType));
                if (Number.isNaN(n)) n = 0;
                loopCounts[endIdx] = (loopCounts[endIdx] ?? 0) + 1;
                if (loopCounts[endIdx] < n) {
                  i = j; // re-run body (for-loop i++ lands on j + 1)
                }
                // else: fall through, loop exits.
              } else {
                // Infinite v2Loop: re-run until break/stop (MAX_STEPS backstop).
                i = j;
              }
              break;
            }
          }
        }
        vr.dropAtOrAbove(indent);
        continue;
      }
      default:
        runDataOpcode(e, ctx, vr);
        continue;
    }
  }
}

// Baseline TriggerContext with empty defaults; callers spread overrides on top.
export function makeTriggerContext(
  overrides: Partial<TriggerContext> &
    Pick<TriggerContext, "mode" | "vars" | "globalVars" | "chat">,
): TriggerContext {
  return {
    charDesc: "",
    personaDesc: "",
    authorNote: "",
    replaceGlobalNote: "",
    lore: [],
    additionalSysPrompt: { start: "", historyend: "", promptend: "" },
    charName: "Assistant",
    userName: "User",
    ...overrides,
  };
}

// Run all scripts of a mode whose conditions pass. Returns the mutated context.
export async function runTriggers(
  scripts: TriggerScript[],
  mode: TriggerEventMode,
  ctx: TriggerContext,
): Promise<TriggerRunResult> {
  ctx.mode = mode;
  for (const script of scripts) {
    if (script.type !== mode) continue;
    const vr = makeResolver(ctx);
    const condPass =
      script.conditions.length === 0 ||
      script.conditions.every((c) => evalCondition(c, ctx, vr));
    if (!condPass) continue;
    ctx.lowLevelAccess = !!script.lowLevelAccess;
    await runEffects(script, ctx);
    if (ctx.stopSending) break;
  }
  return { context: ctx, stopped: !!ctx.stopSending };
}

// Parse a stored triggers JSON column into typed scripts (loose -> narrowed).
export function parseTriggerScripts(raw: unknown): TriggerScript[] {
  if (!raw) return [];
  let arr: unknown = raw;
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  const out: TriggerScript[] = [];
  for (const c of arr) {
    if (!c || typeof c !== "object") continue;
    const o = c as Record<string, unknown>;
    // A keyword-array element (legacy turn-gating) is not a trigger script.
    if (typeof o.type !== "string" || !Array.isArray(o.effect)) continue;
    out.push({
      comment: typeof o.comment === "string" ? o.comment : "",
      type: o.type as TriggerScript["type"],
      conditions: Array.isArray(o.conditions)
        ? (o.conditions as TriggerScript["conditions"])
        : [],
      effect: o.effect as TriggerScript["effect"],
      lowLevelAccess: !!o.lowLevelAccess,
    });
  }
  return out;
}
