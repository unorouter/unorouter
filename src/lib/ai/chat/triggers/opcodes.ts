import { rec } from "@/lib/utils/base";
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

function parseArr(s: string): string[] {
  const v = JSON.parse(s);
  if (!Array.isArray(v)) throw new Error("not-array");
  return v.map(String);
}

function parseDict(s: string): Record<string, string> {
  const v = rec(JSON.parse(s));
  if (!v) throw new Error("not-dict");
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v)) out[k] = String(val);
  return out;
}

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

type SysPromptLocation = "start" | "historyend" | "promptend";
// TriggerEffect fields come from user-authored JSON, so narrow, never cast.
function sysPromptLocation(raw: unknown): SysPromptLocation {
  return raw === "start" || raw === "historyend" ? raw : "promptend";
}

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

export function runDataOpcode(
  e: TriggerEffect,
  ctx: TriggerContext,
  vr: VarResolver,
): void {
  const setOut = (v: string) => {
    const name = cbs(ctx, e.outputVar);
    if (name) vr.set(name, v);
  };

  switch (e.type) {
    // v1 `setvar` reads value literally; v2 honours valueType. Same arithmetic.
    case "v2SetVar":
    case "setvar": {
      const value =
        e.type === "v2SetVar" ? rv(e, ctx, vr, "value") : cbs(ctx, e.value);
      const varKey = cbs(ctx, e.var);
      const cur = Number(vr.get(varKey));
      const base = Number.isNaN(cur) ? 0 : cur;
      const n = Number(value);
      const ops: Record<string, () => string> = {
        "+=": () => String(base + n),
        "-=": () => String(base - n),
        "*=": () => String(base * n),
        "/=": () => String(base / n),
        // v1 setvar never had %=, and there it must keep falling through to a
        // plain assignment.
        ...(e.type === "v2SetVar" ? { "%=": () => String(base % n) } : {}),
      };
      const op = typeof e.operator === "string" ? ops[e.operator] : undefined;
      vr.set(varKey, op ? op() : value);
      return;
    }
    case "systemprompt":
      ctx.additionalSysPrompt[sysPromptLocation(e.location)] +=
        cbs(ctx, e.value) + "\n\n";
      return;
    case "impersonate": {
      const role = e.role === "char" ? "assistant" : "user";
      ctx.chat.push({ role, data: cbs(ctx, e.value) });
      return;
    }
    case "cutchat": {
      const start = Number(cbs(ctx, e.start));
      const end = Number(cbs(ctx, e.end));
      ctx.chat = ctx.chat.slice(start, end);
      return;
    }
    case "modifychat": {
      const i = Number(cbs(ctx, e.index));
      if (ctx.chat[i]) ctx.chat[i].data = cbs(ctx, e.value);
      return;
    }
    case "stop":
      ctx.stopSending = true;
      return;
    case "runtrigger":
    case "command":
      return;

    case "v2GetCharAt": {
      const source = rv(e, ctx, vr, "source");
      const i = rnum(e, ctx, vr, "index");
      setOut(source[i] ?? "null");
      return;
    }
    case "v2GetCharCount":
      setOut(String(rv(e, ctx, vr, "source").length));
      return;
    case "v2ToLowerCase":
      setOut(rv(e, ctx, vr, "source").toLowerCase());
      return;
    case "v2ToUpperCase":
      setOut(rv(e, ctx, vr, "source").toUpperCase());
      return;
    case "v2SetCharAt": {
      const chars = [...rv(e, ctx, vr, "source")];
      chars[rnum(e, ctx, vr, "index")] = rv(e, ctx, vr, "value");
      setOut(chars.join(""));
      return;
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
      return;
    }
    case "v2ConcatString":
      setOut(rv(e, ctx, vr, "source1") + rv(e, ctx, vr, "source2"));
      return;
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
      return;
    }
    case "v2RegexTest": {
      try {
        const re = new RegExp(rv(e, ctx, vr, "regex"), rv(e, ctx, vr, "flags"));
        setOut(re.test(rv(e, ctx, vr, "value")) ? "1" : "0");
      } catch {
        setOut("0");
      }
      return;
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
            const match = String(args[0]);
            const offsetIdx = args.findIndex((a) => typeof a === "number");
            const groups = args.slice(1, offsetIdx).map(String);
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
      return;
    }

    case "v2MakeArrayVar": {
      const name = cbs(ctx, e.var);
      if (name.startsWith("[") && name.endsWith("]")) return;
      vr.set(name, "[]");
      return;
    }
    case "v2GetArrayVarLength":
      setOut(
        readJson(parseArr, vr.get(cbs(ctx, e.var)), "0", (a) =>
          String(a.length),
        ),
      );
      return;
    case "v2GetArrayVar":
      setOut(
        readJson(
          parseArr,
          vr.get(cbs(ctx, e.var)),
          "null",
          (a) => a[rnum(e, ctx, vr, "index")] ?? "null",
        ),
      );
      return;
    case "v2SetArrayVar": {
      const i = rnum(e, ctx, vr, "index");
      if (Number.isNaN(i)) return;
      try {
        const name = cbs(ctx, e.var);
        const arr = parseArr(vr.get(name));
        arr[i] = rv(e, ctx, vr, "value");
        vr.set(name, JSON.stringify(arr));
      } catch {}
      return;
    }
    case "v2PushArrayVar":
      withArrVar(e, ctx, vr, (a) => (a.push(rv(e, ctx, vr, "value")), a));
      return;
    case "v2PopArrayVar":
      withArrVar(e, ctx, vr, (a) => (setOut(a.pop() ?? "null"), a), "null");
      return;
    case "v2ShiftArrayVar":
      withArrVar(e, ctx, vr, (a) => (setOut(a.shift() ?? "null"), a), "null");
      return;
    case "v2UnshiftArrayVar":
      withArrVar(e, ctx, vr, (a) => (a.unshift(rv(e, ctx, vr, "value")), a));
      return;
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
      return;
    case "v2SliceArrayVar":
      setOut(
        readJson(parseArr, vr.get(cbs(ctx, e.var)), "[]", (a) =>
          JSON.stringify(
            a.slice(rnum(e, ctx, vr, "start"), rnum(e, ctx, vr, "end")),
          ),
        ),
      );
      return;
    case "v2GetIndexOfValueInArrayVar":
      setOut(
        readJson(parseArr, vr.get(cbs(ctx, e.var)), "-1", (a) =>
          String(a.indexOf(rv(e, ctx, vr, "value"))),
        ),
      );
      return;
    case "v2RemoveIndexFromArrayVar":
      withArrVar(
        e,
        ctx,
        vr,
        (a) => (a.splice(rnum(e, ctx, vr, "index"), 1), a),
      );
      return;
    case "v2JoinArrayVar":
      setOut(
        readJson(parseArr, rv(e, ctx, vr, "var"), "", (a) =>
          a.join(rv(e, ctx, vr, "delimiter")),
        ),
      );
      return;

    case "v2MakeDictVar":
    case "v2ClearDict": {
      const name = cbs(ctx, e.var);
      if (name.startsWith("{") && name.endsWith("}")) return;
      vr.set(name, "{}");
      return;
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
      return;
    case "v2SetDictVar":
    case "v2DeleteDictKey": {
      if (e.varType === "value") return;
      const name = cbs(ctx, e.var);
      let dict: Record<string, string>;
      try {
        dict = parseDict(vr.get(name));
      } catch {
        dict = {};
      }
      const key = rv(e, ctx, vr, "key");
      if (e.type === "v2SetDictVar") dict[key] = rv(e, ctx, vr, "value");
      else delete dict[key];
      vr.set(name, JSON.stringify(dict));
      return;
    }
    case "v2HasDictKey":
      setOut(
        readJson(parseDict, rv(e, ctx, vr, "var"), "0", (d) =>
          Object.hasOwn(d, rv(e, ctx, vr, "key")) ? "1" : "0",
        ),
      );
      return;
    case "v2GetDictSize":
      setOut(
        readJson(parseDict, rv(e, ctx, vr, "var"), "0", (d) =>
          String(Object.keys(d).length),
        ),
      );
      return;
    case "v2GetDictKeys":
      setOut(
        readJson(parseDict, rv(e, ctx, vr, "var"), "[]", (d) =>
          JSON.stringify(Object.keys(d)),
        ),
      );
      return;
    case "v2GetDictValues":
      setOut(
        readJson(parseDict, rv(e, ctx, vr, "var"), "[]", (d) =>
          JSON.stringify(Object.values(d)),
        ),
      );
      return;

    case "v2Random": {
      const min = rnum(e, ctx, vr, "min");
      const max = rnum(e, ctx, vr, "max");
      const prev = Number(vr.get("__rand_state"));
      let seed =
        Number.isFinite(prev) && prev > 0
          ? prev >>> 0
          : (min * 2654435761 + max * 40503 + 1) >>> 0;
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      vr.set("__rand_state", String(seed));
      setOut(String(Math.floor((seed / 0x7fffffff) * (max - min + 1) + min)));
      return;
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
      return;
    }
    case "v2Tokenize":
      setOut(
        String(rv(e, ctx, vr, "value").split(/\s+/).filter(Boolean).length),
      );
      return;

    case "v2GetLastMessage":
      setOut(ctx.chat.at(-1)?.data ?? "null");
      return;
    case "v2GetFirstMessage":
      setOut(ctx.chat[0]?.data ?? "null");
      return;
    case "v2GetLastUserMessage":
      setOut(ctx.chat.findLast((m) => m.role === "user")?.data ?? "null");
      return;
    case "v2GetLastCharMessage":
      setOut(ctx.chat.findLast((m) => m.role === "assistant")?.data ?? "null");
      return;
    case "v2GetMessageAtIndex":
      setOut(ctx.chat[rnum(e, ctx, vr, "index")]?.data ?? "null");
      return;
    case "v2GetMessageCount":
      setOut(String(ctx.chat.length));
      return;
    case "v2QuickSearchChat": {
      const value = rv(e, ctx, vr, "value");
      const depth = rnum(e, ctx, vr, "depth");
      if (Number.isNaN(depth)) {
        setOut("0");
        return;
      }
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
      return;
    }

    case "v2CutChat": {
      const start = rnum(e, ctx, vr, "start");
      const end = rnum(e, ctx, vr, "end");
      ctx.chat = ctx.chat.slice(start, end);
      return;
    }
    case "v2ModifyChat": {
      const i = rnum(e, ctx, vr, "index");
      if (ctx.chat[i]) ctx.chat[i].data = rv(e, ctx, vr, "value");
      return;
    }
    case "v2Impersonate": {
      const role = e.role === "user" ? "user" : "assistant";
      ctx.chat.push({ role, data: rv(e, ctx, vr, "value") });
      return;
    }
    case "v2UpdateChatAt":
      return;

    case "v2GetAllLorebooks":
      setOut(JSON.stringify(ctx.lore.map((l) => l.content)));
      return;
    case "v2GetLorebookCount":
    case "v2GetLorebookCountNew":
      setOut(String(ctx.lore.length));
      return;
    case "v2GetLorebookByIndex":
    case "v2GetLorebookEntry": {
      const i = rnum(e, ctx, vr, "index");
      setOut(ctx.lore[i]?.content ?? "null");
      return;
    }
    case "v2GetLorebook": {
      const target = rv(e, ctx, vr, "target");
      const found = ctx.lore.find((l) => l.comment === target);
      setOut(found ? found.content : "null");
      return;
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
      return;
    }
    case "v2GetLorebookIndexViaName": {
      const name = rv(e, ctx, vr, "name");
      setOut(String(ctx.lore.findIndex((l) => l.comment === name)));
      return;
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
      return;
    }
    case "v2ModifyLorebook": {
      const target = rv(e, ctx, vr, "target");
      const found = ctx.lore.find((l) => l.comment === target);
      if (found) found.content = rv(e, ctx, vr, "value");
      return;
    }
    case "v2ModifyLorebookByIndex": {
      const i = rnum(e, ctx, vr, "index");
      const lore = ctx.lore[i];
      if (Number.isNaN(i) || !lore) return;
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
      return;
    }
    case "v2DeleteLorebookByIndex": {
      const i = rnum(e, ctx, vr, "index");
      if (!Number.isNaN(i) && i >= 0 && i < ctx.lore.length)
        ctx.lore.splice(i, 1);
      return;
    }
    case "v2SetLorebookActivation":
    case "v2SetLorebookAlwaysActive": {
      const i = rnum(e, ctx, vr, "index");
      const lore = ctx.lore[i];
      if (lore) lore.alwaysActive = e.value === true || e.value === "true";
      return;
    }

    case "v2GetCharacterDesc":
      setOut(ctx.charDesc);
      return;
    case "v2SetCharacterDesc":
      ctx.charDesc = rv(e, ctx, vr, "value");
      return;
    case "v2GetPersonaDesc":
      setOut(ctx.personaDesc);
      return;
    case "v2SetPersonaDesc":
      ctx.personaDesc = rv(e, ctx, vr, "value");
      return;
    case "v2GetAuthorNote":
      setOut(ctx.authorNote ?? "");
      return;
    case "v2SetAuthorNote":
      ctx.authorNote = rv(e, ctx, vr, "value");
      return;
    case "v2GetReplaceGlobalNote":
      setOut(ctx.replaceGlobalNote ?? "");
      return;
    case "v2SetReplaceGlobalNote":
      ctx.replaceGlobalNote = rv(e, ctx, vr, "value");
      return;

    case "v2SystemPrompt":
      ctx.additionalSysPrompt[sysPromptLocation(e.location)] +=
        rv(e, ctx, vr, "value") + "\n\n";
      return;
    case "v2StopPromptSending":
      ctx.stopSending = true;
      return;
    case "v2SendAIprompt":
      ctx.sendAIprompt = true;
      return;
    case "v2Header":
    case "v2ConsoleLog":
    case "v2Comment":
    case "v2UpdateGUI":
    case "v2Wait":
      return;

    case "v2GetAlertInput":
    case "v2GetAlertSelect":
      setOut("null");
      return;

    case "v2RunLLM":
    case "v2ImgGen":
    case "v2CheckSimilarity":
    case "v2ShowAlert":
    case "v2Command":
    case "v2RunTrigger":
      return;
  }
}
