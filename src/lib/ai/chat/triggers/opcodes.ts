// V2 trigger opcode handlers (RisuAI port). Operands are literal when <field>Type is 'value' else a var lookup. Side effects no-op here.

import { calcString } from "../calc";
import type { TriggerContext, TriggerEffect } from "./types";

export type VarResolver = {
  get: (name: string) => string;
  set: (name: string, value: string) => void;
};

export function cbs(ctx: TriggerContext, s: unknown): string {
  const raw = String(s ?? "");
  return ctx.parse ? ctx.parse(raw) : raw;
}

// Resolve an operand per Risu: literal when <field>Type is "value", else a var lookup of the parsed name.
function rv(
  e: TriggerEffect,
  ctx: TriggerContext,
  vr: VarResolver,
  field: string,
): string {
  const raw = cbs(ctx, e[field]);
  return e[`${field}Type`] === "value" ? raw : vr.get(raw);
}

function rnum(
  e: TriggerEffect,
  ctx: TriggerContext,
  vr: VarResolver,
  field: string,
): number {
  return Number(rv(e, ctx, vr, field));
}

function outName(e: TriggerEffect, ctx: TriggerContext): string {
  return cbs(ctx, e.outputVar);
}

function parseArr(s: string): string[] {
  const v = JSON.parse(s);
  if (!Array.isArray(v)) throw new Error("not-array");
  return v.map(String);
}

function parseDict(s: string): Record<string, string> {
  const v = JSON.parse(s);
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw new Error("not-dict");
  return v as Record<string, string>;
}

// Array-var mutation: parse the var as a JSON array, run fn, write back. On parse failure Risu resets to '[]' and writes errOut.
function withArrVar(
  e: TriggerEffect,
  ctx: TriggerContext,
  vr: VarResolver,
  fn: (arr: string[]) => string[] | undefined,
  errOut?: string,
): void {
  const name = cbs(ctx, e.var);
  try {
    const arr = parseArr(vr.get(name));
    const next = fn(arr);
    if (next) vr.set(name, JSON.stringify(next));
  } catch {
    vr.set(name, "[]");
    if (errOut !== undefined && e.outputVar) {
      vr.set(cbs(ctx, e.outputVar), errOut);
    }
  }
}

// Read-only helper: parse, compute the output value, fall back on error.
function readJson<T>(
  parse: (s: string) => T,
  raw: string,
  fallback: string,
  fn: (v: T) => string,
): string {
  try {
    return fn(parse(raw));
  } catch {
    return fallback;
  }
}

// $0-aware group-ref expansion shared by ExtractRegex (Risu lines 1941-1948).
function expandExtract(fmt: string, m: RegExpExecArray | null): string {
  if (!m) {
    return fmt
      .replace(/\$[0-9]+/g, "")
      .replace(/\$&/g, "")
      .replace(/\$\$/g, "$");
  }
  return fmt
    .replace(/\$[0-9]+/g, (p) => m[Number(p.slice(1))] ?? "")
    .replace(/\$&/g, m[0] ?? "")
    .replace(/\$\$/g, "$");
}

// The opcode table. Returns true when handled; control-flow/unknown -> false.
export function runDataOpcode(
  e: TriggerEffect,
  ctx: TriggerContext,
  vr: VarResolver,
): boolean {
  const setOut = (v: string) => {
    const name = outName(e, ctx);
    if (name) vr.set(name, v);
  };

  switch (e.type) {
    case "v2SetVar": {
      const value = rv(e, ctx, vr, "value");
      const varKey = cbs(ctx, e.var);
      let cur = Number(vr.get(varKey));
      if (Number.isNaN(cur)) cur = 0;
      let next: string;
      switch (e.operator) {
        case "+=":
          next = String(cur + Number(value));
          break;
        case "-=":
          next = String(cur - Number(value));
          break;
        case "*=":
          next = String(cur * Number(value));
          break;
        case "/=":
          next = String(cur / Number(value));
          break;
        case "%=":
          next = String(cur % Number(value));
          break;
        default:
          next = value;
      }
      vr.set(varKey, next);
      return true;
    }

    case "setvar": {
      const value = cbs(ctx, e.value);
      const varKey = cbs(ctx, e.var);
      let cur = Number(vr.get(varKey));
      if (Number.isNaN(cur)) cur = 0;
      let next: string;
      switch (e.operator) {
        case "+=":
          next = String(cur + Number(value));
          break;
        case "-=":
          next = String(cur - Number(value));
          break;
        case "*=":
          next = String(cur * Number(value));
          break;
        case "/=":
          next = String(cur / Number(value));
          break;
        default:
          next = value;
      }
      vr.set(varKey, next);
      return true;
    }
    case "systemprompt": {
      const loc = (e.location ?? "promptend") as
        | "start"
        | "historyend"
        | "promptend";
      ctx.additionalSysPrompt[loc] += cbs(ctx, e.value) + "\n\n";
      return true;
    }
    case "impersonate": {
      const role = e.role === "char" ? "assistant" : "user";
      ctx.chat.push({ role, data: cbs(ctx, e.value) });
      return true;
    }
    case "cutchat": {
      const start = Number(cbs(ctx, e.start));
      const end = Number(cbs(ctx, e.end));
      ctx.chat = ctx.chat.slice(start, end);
      return true;
    }
    case "modifychat": {
      const i = Number(cbs(ctx, e.index));
      if (ctx.chat[i]) ctx.chat[i].data = cbs(ctx, e.value);
      return true;
    }
    case "stop":
      ctx.stopSending = true;
      return true;
    case "runtrigger":
    case "command":
      return true; // recursion/commands: no-op in the isomorphic core

    case "v2GetCharAt": {
      const source = rv(e, ctx, vr, "source");
      const i = rnum(e, ctx, vr, "index");
      setOut(source[i] ?? "null");
      return true;
    }
    case "v2GetCharCount":
      setOut(String(rv(e, ctx, vr, "source").length));
      return true;
    case "v2ToLowerCase":
      setOut(rv(e, ctx, vr, "source").toLowerCase());
      return true;
    case "v2ToUpperCase":
      setOut(rv(e, ctx, vr, "source").toUpperCase());
      return true;
    case "v2SetCharAt": {
      const chars = [...rv(e, ctx, vr, "source")];
      chars[rnum(e, ctx, vr, "index")] = rv(e, ctx, vr, "value");
      setOut(chars.join(""));
      return true;
    }
    case "v2SplitString": {
      const source = rv(e, ctx, vr, "source");
      let result: string[];
      if (e.delimiterType === "regex") {
        const delim = cbs(ctx, e.delimiter);
        try {
          const m = delim.match(/^\/(.+)\/([gimuy]*)$/);
          result = source.split(m ? new RegExp(m[1], m[2]) : new RegExp(delim));
        } catch {
          result = [source];
        }
      } else {
        result = source.split(rv(e, ctx, vr, "delimiter"));
      }
      setOut(JSON.stringify(result));
      return true;
    }
    case "v2ConcatString":
      setOut(rv(e, ctx, vr, "source1") + rv(e, ctx, vr, "source2"));
      return true;
    case "v2ExtractRegex": {
      const value = rv(e, ctx, vr, "value");
      const pattern = rv(e, ctx, vr, "regex");
      const flags = rv(e, ctx, vr, "flags");
      const fmt = rv(e, ctx, vr, "result");
      try {
        setOut(expandExtract(fmt, new RegExp(pattern, flags).exec(value)));
      } catch {
        setOut(expandExtract(fmt, null));
      }
      return true;
    }
    case "v2RegexTest": {
      try {
        const re = new RegExp(rv(e, ctx, vr, "regex"), rv(e, ctx, vr, "flags"));
        setOut(re.test(rv(e, ctx, vr, "value")) ? "1" : "0");
      } catch {
        setOut("0");
      }
      return true;
    }
    case "v2ReplaceString": {
      const source = rv(e, ctx, vr, "source");
      try {
        const pattern = rv(e, ctx, vr, "regex");
        const fmt = rv(e, ctx, vr, "result");
        const replacement = rv(e, ctx, vr, "replacement");
        const flags = rv(e, ctx, vr, "flags");
        const re = new RegExp(pattern, flags);
        setOut(
          source.replace(re, (...args) => {
            const match = args[0] as string;
            const offsetIdx = args.findIndex((a) => typeof a === "number");
            const groups = args.slice(1, offsetIdx) as string[];
            // `$N` result targets group N: replace that group inside the match.
            const target = fmt.match(/^\$(\d+)$/);
            if (target) {
              const idx = Number(target[1]);
              if (idx === 0) return replacement;
              const grp = groups[idx - 1];
              if (grp) return match.replace(grp, replacement);
            }
            return fmt
              .replace(/\$[0-9]+/g, (p) => {
                const idx = Number(p.slice(1));
                return idx === 0 ? match : groups[idx - 1] || "";
              })
              .replace(/\$&/g, match)
              .replace(/\$\$/g, "$");
          }),
        );
      } catch {
        setOut(source);
      }
      return true;
    }

    case "v2MakeArrayVar": {
      const name = cbs(ctx, e.var);
      if (name.startsWith("[") && name.endsWith("]")) return true;
      vr.set(name, "[]");
      return true;
    }
    case "v2GetArrayVarLength":
      setOut(
        readJson(parseArr, vr.get(cbs(ctx, e.var)), "0", (a) =>
          String(a.length),
        ),
      );
      return true;
    case "v2GetArrayVar":
      setOut(
        readJson(
          parseArr,
          vr.get(cbs(ctx, e.var)),
          "null",
          (a) => a[rnum(e, ctx, vr, "index")] ?? "null",
        ),
      );
      return true;
    case "v2SetArrayVar": {
      const i = rnum(e, ctx, vr, "index");
      if (Number.isNaN(i)) return true;
      try {
        const name = cbs(ctx, e.var);
        const arr = parseArr(vr.get(name));
        arr[i] = rv(e, ctx, vr, "value");
        vr.set(name, JSON.stringify(arr));
      } catch {
        // Risu: silent
      }
      return true;
    }
    case "v2PushArrayVar":
      withArrVar(e, ctx, vr, (a) => (a.push(rv(e, ctx, vr, "value")), a));
      return true;
    case "v2PopArrayVar":
      withArrVar(e, ctx, vr, (a) => (setOut(a.pop() ?? "null"), a), "null");
      return true;
    case "v2ShiftArrayVar":
      withArrVar(e, ctx, vr, (a) => (setOut(a.shift() ?? "null"), a), "null");
      return true;
    case "v2UnshiftArrayVar":
      withArrVar(e, ctx, vr, (a) => (a.unshift(rv(e, ctx, vr, "value")), a));
      return true;
    case "v2SpliceArrayVar":
      withArrVar(
        e,
        ctx,
        vr,
        (a) => (
          a.splice(rnum(e, ctx, vr, "start"), 0, rv(e, ctx, vr, "item")),
          a
        ),
      );
      return true;
    case "v2SliceArrayVar":
      setOut(
        readJson(parseArr, vr.get(cbs(ctx, e.var)), "[]", (a) =>
          JSON.stringify(
            a.slice(rnum(e, ctx, vr, "start"), rnum(e, ctx, vr, "end")),
          ),
        ),
      );
      return true;
    case "v2GetIndexOfValueInArrayVar":
      setOut(
        readJson(parseArr, vr.get(cbs(ctx, e.var)), "-1", (a) =>
          String(a.indexOf(rv(e, ctx, vr, "value"))),
        ),
      );
      return true;
    case "v2RemoveIndexFromArrayVar":
      withArrVar(
        e,
        ctx,
        vr,
        (a) => (a.splice(rnum(e, ctx, vr, "index"), 1), a),
      );
      return true;
    case "v2JoinArrayVar":
      setOut(
        readJson(parseArr, rv(e, ctx, vr, "var"), "", (a) =>
          a.join(rv(e, ctx, vr, "delimiter")),
        ),
      );
      return true;

    case "v2MakeDictVar": {
      const name = cbs(ctx, e.var);
      if (name.startsWith("{") && name.endsWith("}")) return true;
      vr.set(name, "{}");
      return true;
    }
    case "v2GetDictVar":
      setOut(
        readJson(
          parseDict,
          rv(e, ctx, vr, "var"),
          "null",
          (d) => d[rv(e, ctx, vr, "key")] ?? "null",
        ),
      );
      return true;
    case "v2SetDictVar":
      try {
        if (e.varType === "value") return true;
        const name = cbs(ctx, e.var);
        const dict = parseDict(vr.get(name));
        dict[rv(e, ctx, vr, "key")] = rv(e, ctx, vr, "value");
        vr.set(name, JSON.stringify(dict));
      } catch {
        // Var did not hold a dict yet: create one (Risu parity).
        if (e.varType !== "value") {
          const dict: Record<string, string> = {};
          dict[rv(e, ctx, vr, "key")] = rv(e, ctx, vr, "value");
          vr.set(cbs(ctx, e.var), JSON.stringify(dict));
        }
      }
      return true;
    case "v2DeleteDictKey":
      try {
        if (e.varType === "value") return true;
        const name = cbs(ctx, e.var);
        const dict = parseDict(vr.get(name));
        delete dict[rv(e, ctx, vr, "key")];
        vr.set(name, JSON.stringify(dict));
      } catch {
        if (e.varType !== "value") vr.set(cbs(ctx, e.var), "{}");
      }
      return true;
    case "v2HasDictKey":
      setOut(
        readJson(parseDict, rv(e, ctx, vr, "var"), "0", (d) =>
          Object.hasOwn(d, rv(e, ctx, vr, "key")) ? "1" : "0",
        ),
      );
      return true;
    case "v2ClearDict": {
      const name = cbs(ctx, e.var);
      if (name.startsWith("{") && name.endsWith("}")) return true;
      vr.set(name, "{}");
      return true;
    }
    case "v2GetDictSize":
      setOut(
        readJson(parseDict, rv(e, ctx, vr, "var"), "0", (d) =>
          String(Object.keys(d).length),
        ),
      );
      return true;
    case "v2GetDictKeys":
      setOut(
        readJson(parseDict, rv(e, ctx, vr, "var"), "[]", (d) =>
          JSON.stringify(Object.keys(d)),
        ),
      );
      return true;
    case "v2GetDictValues":
      setOut(
        readJson(parseDict, rv(e, ctx, vr, "var"), "[]", (d) =>
          JSON.stringify(Object.values(d)),
        ),
      );
      return true;

    case "v2Random": {
      const min = rnum(e, ctx, vr, "min");
      const max = rnum(e, ctx, vr, "max");
      // Deterministic LCG advanced through a hidden VM var: a run yields the same sequence, later calls differ.
      const prev = Number(vr.get("__rand_state"));
      let seed =
        Number.isFinite(prev) && prev > 0
          ? prev >>> 0
          : (min * 2654435761 + max * 40503 + 1) >>> 0;
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      vr.set("__rand_state", String(seed));
      setOut(String(Math.floor((seed / 0x7fffffff) * (max - min + 1) + min)));
      return true;
    }
    case "v2Calculate": {
      try {
        const expr = rv(e, ctx, vr, "expression").replace(
          /\$([a-zA-Z0-9_]+)/g,
          (_, name: string) => {
            const v = parseFloat(vr.get(name));
            return Number.isNaN(v) ? "0" : v.toString();
          },
        );
        const result = calcString(expr, { chatVar: (n) => vr.get(n) });
        setOut(Number.isNaN(result) ? "0" : String(result));
      } catch {
        setOut("0");
      }
      return true;
    }
    case "v2Tokenize":
      // No tokenizer in the isomorphic core; rough word estimate.
      setOut(
        String(rv(e, ctx, vr, "value").split(/\s+/).filter(Boolean).length),
      );
      return true;

    case "v2GetLastMessage":
      setOut(ctx.chat.at(-1)?.data ?? "null");
      return true;
    case "v2GetFirstMessage":
      setOut(ctx.chat[0]?.data ?? "null");
      return true;
    case "v2GetLastUserMessage":
      setOut(
        [...ctx.chat].reverse().find((m) => m.role === "user")?.data ?? "null",
      );
      return true;
    case "v2GetLastCharMessage":
      setOut(
        [...ctx.chat].reverse().find((m) => m.role === "assistant")?.data ??
          "null",
      );
      return true;
    case "v2GetMessageAtIndex":
      setOut(ctx.chat[rnum(e, ctx, vr, "index")]?.data ?? "null");
      return true;
    case "v2GetMessageCount":
      setOut(String(ctx.chat.length));
      return true;
    case "v2QuickSearchChat": {
      const value = rv(e, ctx, vr, "value");
      const depth = rnum(e, ctx, vr, "depth");
      if (Number.isNaN(depth)) {
        setOut("0");
        return true;
      }
      // Risu joins the slice once and searches the joined text.
      const da = ctx.chat
        .slice(0 - depth)
        .map((m) => m.data)
        .join(" ");
      let pass = false;
      if (e.condition === "strict") pass = da.split(" ").includes(value);
      else if (e.condition === "regex") {
        try {
          pass = new RegExp(value).test(da);
        } catch {
          pass = false;
        }
      } else pass = da.toLowerCase().includes(value.toLowerCase());
      setOut(pass ? "1" : "0");
      return true;
    }

    case "v2CutChat": {
      const start = rnum(e, ctx, vr, "start");
      const end = rnum(e, ctx, vr, "end");
      ctx.chat = ctx.chat.slice(start, end);
      return true;
    }
    case "v2ModifyChat": {
      const i = rnum(e, ctx, vr, "index");
      if (ctx.chat[i]) ctx.chat[i].data = rv(e, ctx, vr, "value");
      return true;
    }
    case "v2Impersonate": {
      // Risu role is 'user' | 'char'.
      const role = e.role === "user" ? "user" : "assistant";
      ctx.chat.push({ role, data: rv(e, ctx, vr, "value") });
      return true;
    }
    case "v2UpdateChatAt":
      return true; // GUI repaint hint

    case "v2GetAllLorebooks":
      setOut(JSON.stringify(ctx.lore.map((l) => l.content)));
      return true;
    case "v2GetLorebookCount":
    case "v2GetLorebookCountNew":
      setOut(String(ctx.lore.length));
      return true;
    case "v2GetLorebookByIndex":
    case "v2GetLorebookEntry": {
      const i = rnum(e, ctx, vr, "index");
      setOut(ctx.lore[i]?.content ?? "null");
      return true;
    }
    case "v2GetLorebook": {
      const target = rv(e, ctx, vr, "target");
      const found = ctx.lore.find((l) => l.comment === target);
      setOut(found ? found.content : "null");
      return true;
    }
    case "v2GetLorebookByName": {
      const name = rv(e, ctx, vr, "name");
      const idxs: number[] = [];
      try {
        const re = new RegExp(name, "i");
        ctx.lore.forEach((l, i) => {
          if (re.test(l.comment)) idxs.push(i);
        });
      } catch {
        ctx.lore.forEach((l, i) => {
          if (l.comment === name) idxs.push(i);
        });
      }
      setOut(JSON.stringify(idxs));
      return true;
    }
    case "v2GetLorebookIndexViaName": {
      const name = rv(e, ctx, vr, "name");
      setOut(String(ctx.lore.findIndex((l) => l.comment === name)));
      return true;
    }
    case "v2CreateLorebook": {
      const insertOrder = rnum(e, ctx, vr, "insertOrder");
      ctx.lore.push({
        comment: rv(e, ctx, vr, "name"),
        content: rv(e, ctx, vr, "content"),
        key: rv(e, ctx, vr, "key"),
        alwaysActive: false,
        insertOrder: Number.isNaN(insertOrder) ? 100 : insertOrder,
      });
      return true;
    }
    case "v2ModifyLorebook": {
      const target = rv(e, ctx, vr, "target");
      const found = ctx.lore.find((l) => l.comment === target);
      if (found) found.content = rv(e, ctx, vr, "value");
      return true;
    }
    case "v2ModifyLorebookByIndex": {
      const i = rnum(e, ctx, vr, "index");
      const lore = ctx.lore[i];
      if (Number.isNaN(i) || !lore) return true;
      lore.comment = rv(e, ctx, vr, "name").replace(
        /\{\{slot\}\}/g,
        lore.comment || "",
      );
      lore.key = rv(e, ctx, vr, "key").replace(/\{\{slot\}\}/g, lore.key || "");
      lore.content = rv(e, ctx, vr, "content").replace(
        /\{\{slot\}\}/g,
        lore.content || "",
      );
      const order = Number(
        rv(e, ctx, vr, "insertOrder").replace(
          /\{\{slot\}\}/g,
          String(lore.insertOrder ?? 100),
        ),
      );
      if (!Number.isNaN(order)) lore.insertOrder = order;
      return true;
    }
    case "v2DeleteLorebookByIndex": {
      const i = rnum(e, ctx, vr, "index");
      if (!Number.isNaN(i) && i >= 0 && i < ctx.lore.length)
        ctx.lore.splice(i, 1);
      return true;
    }
    case "v2SetLorebookActivation":
    case "v2SetLorebookAlwaysActive": {
      const i = rnum(e, ctx, vr, "index");
      const lore = ctx.lore[i];
      // `value` is a raw boolean on these two opcodes (no valueType).
      if (lore) lore.alwaysActive = e.value === true || e.value === "true";
      return true;
    }

    case "v2GetCharacterDesc":
      setOut(ctx.charDesc);
      return true;
    case "v2SetCharacterDesc":
      ctx.charDesc = rv(e, ctx, vr, "value");
      return true;
    case "v2GetPersonaDesc":
      setOut(ctx.personaDesc);
      return true;
    case "v2SetPersonaDesc":
      ctx.personaDesc = rv(e, ctx, vr, "value");
      return true;
    case "v2GetAuthorNote":
      setOut(ctx.authorNote ?? "");
      return true;
    case "v2SetAuthorNote":
      ctx.authorNote = rv(e, ctx, vr, "value");
      return true;
    case "v2GetReplaceGlobalNote":
      setOut(ctx.replaceGlobalNote ?? "");
      return true;
    case "v2SetReplaceGlobalNote":
      ctx.replaceGlobalNote = rv(e, ctx, vr, "value");
      return true;

    case "v2SystemPrompt": {
      const loc = (e.location ?? "promptend") as
        | "start"
        | "historyend"
        | "promptend";
      ctx.additionalSysPrompt[loc] += rv(e, ctx, vr, "value") + "\n\n";
      return true;
    }
    case "v2StopPromptSending":
      ctx.stopSending = true;
      return true;
    case "v2SendAIprompt":
      ctx.sendAIprompt = true;
      return true;
    case "v2Header":
    case "v2ConsoleLog":
    case "v2Comment":
    case "v2UpdateGUI":
    case "v2Wait":
      return true;

    case "v2GetAlertInput":
    case "v2GetAlertSelect":
      setOut("null");
      return true;

    case "v2GetRequestStateLength":
      setOut(String(ctx.formated?.length ?? 0));
      return true;
    case "v2GetRequestState":
      setOut(ctx.formated?.[rnum(e, ctx, vr, "index")]?.content ?? "null");
      return true;
    case "v2SetRequestState": {
      const f = ctx.formated?.[rnum(e, ctx, vr, "index")];
      if (f) f.content = rv(e, ctx, vr, "value");
      return true;
    }
    case "v2GetRequestStateRole":
      setOut(ctx.formated?.[rnum(e, ctx, vr, "index")]?.role ?? "null");
      return true;
    case "v2SetRequestStateRole": {
      const f = ctx.formated?.[rnum(e, ctx, vr, "index")];
      const r = rv(e, ctx, vr, "value");
      if (f && (r === "user" || r === "assistant" || r === "system"))
        f.role = r;
      return true;
    }
    case "v2GetDisplayState":
      setOut(ctx.displayData ?? "null");
      return true;
    case "v2SetDisplayState":
      ctx.displayData = rv(e, ctx, vr, "value");
      return true;

    case "v2RunLLM":
    case "v2ImgGen":
    case "v2CheckSimilarity":
    case "v2ShowAlert":
    case "v2Command":
    case "v2RunTrigger":
      return true;

    default:
      return false; // control-flow or unknown: VM loop handles / ignores
  }
}
