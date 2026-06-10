// CBS macro evaluator, full port of the RisuAI engine (src/ts/cbs.ts).
// App-coupled macros (asset/image/inlay/module/...) resolve to safe
// empty/passthrough server-side instead of leaking as literal {{...}}.

import { calcString, seededRand } from "@/lib/ai/chat/calc";
import { dayjs } from "@/lib/utils/format/date";

export type MacroScope = {
  user: string;
  char: string;
  user_description: string;
  char_description: string;
  scenario: string;
  personality: string;
  // Per-conversation vars; mutated in place by setvar/addvar, caller persists.
  vars: Record<string, string>;
  // Per-user global vars; mutated in place, caller persists if changed.
  globalVars?: Record<string, string>;
  // Per-assembly scratch store (settempvar/gettempvar). Never persisted.
  tempVars?: Record<string, string>;
  // Newest last, for the {{history}}/{{lastmessage}} family.
  history?: { role: "user" | "assistant" | "system"; text: string }[];
  // Per-conv seed so roll/random/pick resolve identically across regenerates (RisuAI determinism).
  seed?: string;
  // Introspection tokens; all optional so fallback assembly paths stay valid.
  model?: string; // {{model}} / metadata::modelname
  maxContext?: number; // {{maxcontext}} / metadata::maxcontext
  jailbreak?: string; // {{jailbreak}} / {{jb}}
  globalNote?: string; // {{globalnote}} / {{ujb}} / {{systemprompt}}
  mainPrompt?: string; // {{main_prompt}}
  prefill?: string; // {{prefill}}
  authorNote?: string; // {{authornote}}
};

const MAX_RECURSION = 20;
// Cap calc/{{?}} expression length so a pathological literal can't hang the eval.
const MAX_CALC_LEN = 1000;

type ScopeField =
  | "user"
  | "char"
  | "user_description"
  | "char_description"
  | "scenario"
  | "personality";
// Field token -> scope key, plus SillyTavern/RisuAI aliases.
const FIELD_ALIASES: Record<string, ScopeField> = {
  user: "user",
  char: "char",
  bot: "char",
  userdescription: "user_description",
  persona: "user_description",
  userpersona: "user_description",
  chardescription: "char_description",
  description: "char_description",
  chardesc: "char_description",
  personality: "personality",
  scenario: "scenario",
};

// `rand` is the [0,1) source (seeded, or Math.random on un-seeded fallback).
function rollDice(spec: string, rand: () => number): string {
  const m = spec.trim().match(/^(\d*)d(\d+)$/i);
  let num = 1;
  let sides: number;
  if (m) {
    num = m[1] ? Number(m[1]) : 1;
    sides = Number(m[2]);
  } else {
    sides = Number(spec.trim());
  }
  // Risu returns the literal string 'NaN' on invalid dice notation.
  if (!Number.isFinite(sides) || sides < 1 || num < 1 || num > 100)
    return "NaN";
  let total = 0;
  for (let i = 0; i < num; i++) total += Math.floor(rand() * sides) + 1;
  return String(total);
}

function pickFrom(args: string[], rand: () => number): string {
  const opts = args.map((s) => s.trim()).filter(Boolean);
  if (opts.length === 0) return "";
  return opts[Math.floor(rand() * opts.length)];
}

// {{calc}} / {{? expr}}: Risu calcString RPN engine ($var chat, @var global, no code exec).
function calc(expr: string, scope: MacroScope): string {
  if (!expr || expr.length > MAX_CALC_LEN) return "";
  const v = calcString(expr, {
    chatVar: (n) => scope.vars[n] ?? "",
    globalVar: (n) => scope.globalVars?.[n] ?? "",
  });
  return Number.isFinite(v) ? String(v) : "";
}

// Risu CBS truthiness: ONLY 'true' and '1' are truthy.
function isTruthy(s: string): boolean {
  const t = s.trim();
  return t === "true" || t === "1";
}

function numStr(n: number): string {
  return Number.isFinite(n) ? String(n) : "";
}

// JSON array helpers mirroring RisuAI makeArray/parseArray.
function parseArr(s: string): unknown[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function parseDictJSON(s: string): Record<string, unknown> {
  try {
    const v = JSON.parse(s);
    return v && typeof v === "object" && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
function elemStr(v: unknown): string {
  return typeof v === "object" && v !== null ? JSON.stringify(v) : String(v);
}
// args -> number[], non-numeric as 0; single JSON-array arg or positional args.
function statNums(args: string[]): number[] {
  const vals = args.length > 1 ? args : parseArr(args[0] ?? "").map(String);
  return vals.map((f) => {
    const n = Number(f);
    return Number.isFinite(n) ? n : 0;
  });
}
// dayjs-based date/time formatter (RisuAI date/time with optional unix arg).
function fmtDate(fmt: string, unixMs?: string): string {
  const d =
    unixMs && Number.isFinite(Number(unixMs)) && Number(unixMs) !== 0
      ? dayjs(Number(unixMs))
      : dayjs();
  return d.format(fmt || "YYYY-MM-DD HH:mm:ss");
}
// Caesar shift (RisuAI crypt), default 32768, self-inverse.
function caesar(s: string, shift: number): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c > 65535) {
      out += s[i];
      continue;
    }
    let n = c + shift;
    if (n > 65535) n -= 65536;
    out += String.fromCharCode(n);
  }
  return out;
}

// Returns null for unknown macros so the caller leaves them verbatim.
function resolveMacro(inner: string, scope: MacroScope): string | null {
  const trimmed = inner.trim();
  if (trimmed.startsWith("//")) return ""; // {{// comment}}
  if (trimmed.startsWith("?")) return calc(trimmed.slice(1), scope); // {{? 1+2}}

  // Risu parser: '::' args when first colon is doubled, else legacy ':' args.
  // Name normalization strips whitespace/_/-.
  const colonIndex = trimmed.indexOf(":");
  const parts =
    colonIndex !== -1 && trimmed[colonIndex + 1] === ":"
      ? trimmed.split("::")
      : trimmed.split(":");
  const name = parts[0]
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");
  const args = parts.slice(1);
  const arg0 = args[0]?.trim() ?? "";

  const field = FIELD_ALIASES[name];
  if (field && args.length === 0) return scope[field];

  // Keyed on macro text + per-conv seed: same macro resolves identically across regenerates.
  const rand = () => seededRand(`${scope.seed ?? ""}:${trimmed}`);

  switch (name) {
    // ---- randomness / dice ----
    case "roll":
    case "dice":
    case "rollp":
      // Risu: no args -> "1"; invalid notation -> "NaN".
      return args.length === 0 ? "1" : rollDice(args.join("::"), rand);
    case "random":
    case "pick":
    case "rollpick":
      return args.length === 0
        ? String(rand())
        : pickFrom(
            args.length > 1 ? args : arg0 ? arg0.split(/[,|]/) : [],
            rand,
          );
    case "randint": {
      const lo = Math.ceil(Number(args[0] ?? "0"));
      const hi = Math.floor(Number(args[1] ?? "0"));
      if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi < lo) return "NaN";
      return String(lo + Math.floor(rand() * (hi - lo + 1)));
    }
    case "hash":
      return (seededRand(arg0) * 10000000 + 1).toFixed(0).padStart(7, "0");

    // ---- arithmetic ----
    case "calc":
      return calc(args.join("::"), scope);
    case "abs":
      return numStr(Math.abs(Number(arg0)));
    case "floor":
      return numStr(Math.floor(Number(arg0)));
    case "ceil":
      return numStr(Math.ceil(Number(arg0)));
    case "round":
      return numStr(Math.round(Number(arg0)));
    case "pow":
      return numStr(Math.pow(Number(args[0]), Number(args[1])));
    case "remaind":
      return numStr(Number(args[0]) % Number(args[1]));
    case "fixnum":
    case "fixnumber": {
      const n = Number(args[0]);
      const d = Number(args[1] ?? "0");
      return Number.isFinite(n) ? n.toFixed(Number.isFinite(d) ? d : 0) : "";
    }
    case "tonumber":
      return [...arg0].filter((v) => !isNaN(Number(v)) || v === ".").join("");
    case "fromhex":
      return numStr(Number.parseInt(arg0, 16));
    case "tohex":
      return Number.parseInt(arg0).toString(16);

    // ---- stats (array or positional) ----
    case "min":
      return numStr(Math.min(...statNums(args)));
    case "max":
      return numStr(Math.max(...statNums(args)));
    case "sum":
      return numStr(statNums(args).reduce((a, b) => a + b, 0));
    case "average": {
      const ns = statNums(args);
      return ns.length
        ? numStr(ns.reduce((a, b) => a + b, 0) / ns.length)
        : "0";
    }

    // ---- comparison / logic (return "1"/"0") ----
    case "equal":
      return args[0] === args[1] ? "1" : "0";
    case "notequal":
      return args[0] !== args[1] ? "1" : "0";
    case "greater":
      return Number(args[0]) > Number(args[1]) ? "1" : "0";
    case "less":
      return Number(args[0]) < Number(args[1]) ? "1" : "0";
    case "greaterequal":
      return Number(args[0]) >= Number(args[1]) ? "1" : "0";
    case "lessequal":
      return Number(args[0]) <= Number(args[1]) ? "1" : "0";
    case "and":
      return args[0] === "1" && args[1] === "1" ? "1" : "0";
    case "or":
      return args[0] === "1" || args[1] === "1" ? "1" : "0";
    case "not":
      return args[0] === "1" ? "0" : "1";
    case "all":
      return (args.length > 1 ? args : parseArr(arg0).map(String)).every(
        (f) => f === "1",
      )
        ? "1"
        : "0";
    case "any":
      return (args.length > 1 ? args : parseArr(arg0).map(String)).some(
        (f) => f === "1",
      )
        ? "1"
        : "0";
    case "iserror":
      return arg0.toLowerCase().startsWith("error:") ? "1" : "0";

    // ---- string ops ----
    case "upper":
      return arg0.toLocaleUpperCase();
    case "lower":
      return arg0.toLocaleLowerCase();
    case "capitalize":
      return arg0 ? arg0.charAt(0).toUpperCase() + arg0.slice(1) : "";
    case "trim":
      return arg0.trim();
    case "length":
      return String(arg0.length);
    case "reverse":
      return [...arg0].reverse().join("");
    case "startswith":
      return arg0.startsWith(args[1] ?? "") ? "1" : "0";
    case "endswith":
      return arg0.endsWith(args[1] ?? "") ? "1" : "0";
    case "contains":
      return arg0.includes(args[1] ?? "") ? "1" : "0";
    case "replace":
      return args.length >= 3 ? args[0].split(args[1]).join(args[2]) : arg0;
    case "split":
      return JSON.stringify(arg0.split(args[1] ?? ""));
    case "join":
      return parseArr(arg0).join(args[1] ?? "");
    case "spread":
      return parseArr(arg0).join("::");
    case "unicodeencode":
      return String(arg0.charCodeAt(args[1] ? Number(args[1]) : 0));
    case "unicodedecode":
      return String.fromCharCode(Number(arg0));
    case "u":
    case "ue":
      return String.fromCharCode(parseInt(arg0, 16));

    // ---- crypto / obfuscation (self-inverse caesar; xor base64) ----
    case "crypt":
    case "crypto":
    case "caesar":
    case "encrypt":
    case "decrypt": {
      let shift = args[1] ? Number(args[1]) : 32768;
      if (!Number.isFinite(shift)) shift = 32768;
      return caesar(arg0, shift);
    }
    case "xor":
    case "xorencrypt":
    case "xorencode":
    case "xore": {
      const bytes = new TextEncoder().encode(arg0);
      // Chunked: spreading a large array into fromCharCode blows the call stack.
      let bin = "";
      for (let i = 0; i < bytes.length; i += 8192) {
        const chunk = bytes.subarray(i, i + 8192);
        bin += String.fromCharCode(...Array.from(chunk, (b) => b ^ 0xff));
      }
      return btoa(bin);
    }
    case "xordecrypt":
    case "xordecode":
    case "xord": {
      const bin = atob(arg0);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i) ^ 0xff;
      return new TextDecoder().decode(bytes);
    }

    // ---- array ops (JSON in/out) ----
    case "makearray":
    case "array":
    case "a":
      return JSON.stringify(args);
    case "arraylength":
      return String(parseArr(arg0).length);
    case "arrayelement":
      return elemStr(parseArr(arg0).at(Number(args[1])) ?? "null");
    case "arrayshift": {
      const arr = parseArr(arg0);
      arr.shift();
      return JSON.stringify(arr);
    }
    case "arraypop": {
      const arr = parseArr(arg0);
      arr.pop();
      return JSON.stringify(arr);
    }
    case "arraypush": {
      const arr = parseArr(arg0);
      arr.push(args[1]);
      return JSON.stringify(arr);
    }
    case "arraysplice": {
      const arr = parseArr(arg0);
      arr.splice(Number(args[1]), Number(args[2]), args[3]);
      return JSON.stringify(arr);
    }
    case "arrayassert": {
      const arr = parseArr(arg0);
      const idx = Number(args[1]);
      if (idx >= arr.length) arr[idx] = args[2];
      return JSON.stringify(arr);
    }
    case "range": {
      const a = parseArr(arg0).map(Number);
      const start = a.length > 1 ? a[0] : 0;
      const end = a.length > 1 ? a[1] : a[0];
      const step = a.length > 2 ? a[2] : 1;
      const out: number[] = [];
      if (Number.isFinite(start) && Number.isFinite(end) && step)
        for (let i = start; i < end; i += step) out.push(i);
      return JSON.stringify(out);
    }
    case "filter": {
      const arr = parseArr(arg0).map(String);
      const mode = args[1];
      return JSON.stringify(
        arr.filter((f, i) => {
          if (mode === "nonempty") return f !== "";
          if (mode === "unique") return i === arr.indexOf(f);
          return f !== "" && i === arr.indexOf(f);
        }),
      );
    }

    // ---- dict / object ops ----
    case "makedict":
    case "dict":
    case "d":
    case "makeobject":
    case "object":
    case "o": {
      const out: Record<string, string> = {};
      for (const a of args) {
        const eq = a.indexOf("=");
        if (eq === -1) continue;
        out[a.slice(0, eq)] = a.slice(eq + 1) || "null";
      }
      return JSON.stringify(out);
    }
    case "dictelement":
    case "objectelement":
      return elemStr(parseDictJSON(arg0)[args[1]] ?? "null");
    case "objectassert":
    case "dictassert":
    case "objectassert": {
      const dict = parseDictJSON(arg0);
      if (!dict[args[1]]) dict[args[1]] = args[2];
      return JSON.stringify(dict);
    }
    case "element":
    case "ele": {
      try {
        let cur = arg0;
        for (const a of args.slice(1)) {
          const parsed = JSON.parse(cur);
          if (parsed === null || typeof parsed !== "object") return "null";
          cur = (parsed as Record<string, unknown>)[a] as string;
          if (cur == null) return "null";
        }
        return elemStr(cur);
      } catch {
        return "null";
      }
    }

    // ---- variables: conversation / global / temp ----
    case "getvar":
      return scope.vars[arg0] ?? "";
    case "setvar":
      if (arg0) scope.vars[arg0] = args[1]?.trim() ?? "";
      return "";
    case "setdefaultvar":
      if (arg0 && !(arg0 in scope.vars))
        scope.vars[arg0] = args[1]?.trim() ?? "";
      return "";
    case "addvar": {
      if (!arg0) return "";
      const cur = Number(scope.vars[arg0] ?? "0");
      const inc = Number(args[1]?.trim() ?? "0");
      scope.vars[arg0] = String(
        (Number.isFinite(cur) ? cur : 0) + (Number.isFinite(inc) ? inc : 0),
      );
      return "";
    }
    case "getglobalvar":
      return scope.globalVars?.[arg0] ?? "";
    case "setglobalvar":
      if (arg0 && scope.globalVars)
        scope.globalVars[arg0] = args[1]?.trim() ?? "";
      return "";
    case "settempvar":
      if (arg0 && scope.tempVars) scope.tempVars[arg0] = args[1]?.trim() ?? "";
      return "";
    case "gettempvar":
    case "tempvar":
      return scope.tempVars?.[arg0] ?? "";

    // ---- chat history readers ----
    case "lastmessage":
      return scope.history?.at(-1)?.text ?? "";
    case "lastusermessage":
      return (
        [...(scope.history ?? [])].reverse().find((m) => m.role === "user")
          ?.text ?? ""
      );
    case "lastcharmessage":
      return (
        [...(scope.history ?? [])].reverse().find((m) => m.role === "assistant")
          ?.text ?? ""
      );
    case "lastmessageid":
    case "lastmessageindex":
      return String((scope.history?.length ?? 0) - 1);
    case "previouschatlog":
      return scope.history?.[Number(arg0)]?.text ?? "Out of range";
    case "history":
    case "messages":
      return (scope.history ?? []).map((m) => m.text).join("\n");
    case "userhistory":
    case "usermessages":
      return (scope.history ?? [])
        .filter((m) => m.role === "user")
        .map((m) => m.text)
        .join("\n");
    case "charhistory":
    case "charmessages":
      return (scope.history ?? [])
        .filter((m) => m.role === "assistant")
        .map((m) => m.text)
        .join("\n");
    case "chatindex":
      return String((scope.history?.length ?? 0) - 1);

    // ---- date / time ----
    case "date":
    case "datetimeformat":
      return args.length === 0
        ? dayjs().format("YYYY-M-D")
        : fmtDate(args[0], args[1]);
    case "time":
      return args.length === 0
        ? dayjs().format("H:m:s")
        : fmtDate(args[0], args[1]);
    case "isodate":
      return dayjs().utc().format("YYYY-M-D");
    case "isotime":
      return dayjs().utc().format("H:m:s");
    case "unixtime":
      return dayjs().unix().toFixed(0);

    // ---- prompt-field tokens ----
    case "mainprompt":
      return scope.mainPrompt ?? "";
    case "jailbreak":
    case "jb":
      return scope.jailbreak ?? "";
    case "globalnote":
    case "ujb":
    case "systemnote":
    case "systemprompt":
      return scope.globalNote ?? "";
    case "prefill":
      return scope.prefill ?? "";
    case "authornote":
      return scope.authorNote ?? "";
    case "model":
      return scope.model ?? "";
    case "maxcontext":
      return String(scope.maxContext ?? 0);
    case "metadata":
      switch (arg0.toLowerCase()) {
        case "modelname":
        case "modelshortname":
        case "modelinternalid":
          return scope.model ?? "";
        case "maxcontext":
          return String(scope.maxContext ?? 0);
        case "node":
          return "1";
        case "risutype":
          return "node";
        case "imateapot":
          return "\u{1FAD6}";
        default:
          return "";
      }

    // ---- literal-character / formatting helpers ----
    case "cbr":
    case "cnl":
    case "cnewline":
      return args.length > 0 ? "\\n".repeat(Math.max(1, Number(arg0))) : "\\n";
    case "tex":
      return `$$${arg0}$$`;
    case "codeblock":
      return `\`\`\`\n${arg0}\n\`\`\``;
    case "raw":
      return arg0;

    default:
      // hasOwn guard: `name` like "toString" must not hit Object prototype.
      return Object.hasOwn(LITERAL_MACROS, name) ? LITERAL_MACROS[name] : null;
  }
}

// Constant-result macros: literal escapes, plus app-coupled tokens that resolve
// empty/"0" so they never leak to the model.
const LITERAL_MACROS: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  const groups: [string, string[]][] = [
    ["\n", ["br", "newline"]],
    ["", ["blank", "none", "comment", "hiddenkey"]],
    ["(", ["displayescapedbracketopen", "debo", "("]],
    [")", ["displayescapedbracketclose", "debc", ")"]],
    ["<", ["displayescapedanglebracketopen", "deabo", "<"]],
    [">", ["displayescapedanglebracketclose", "deabc", ">"]],
    [":", ["displayescapedcolon", "dec"]],
    [";", ["displayescapedsemicolon"]],
    ["{", ["decbo", "displayescapedcurlybracketopen"]],
    ["}", ["decbc", "displayescapedcurlybracketclose"]],
    ["{{", ["bo", "ddecbo", "doubledisplayescapedcurlybracketopen"]],
    ["}}", ["bc", "ddecbc", "doubledisplayescapedcurlybracketclose"]],
    // App-coupled render tokens -> empty.
    [
      "",
      "asset assetlist emotion emotionlist image img audio video videoimg bg bgm inlay inlayed inlayeddata path source button risu ruby furigana katex latex chardisplayasset moduleassetlist screenwidth screenheight".split(
        " ",
      ),
    ],
    // App-coupled boolean probes -> "0".
    [
      "0",
      "moduleenabled jbtoggled isfirstmsg isfirstmessage prefillsupported".split(
        " ",
      ),
    ],
  ];
  for (const [value, names] of groups) for (const n of names) out[n] = value;
  return out;
})();

// {{#if cond}} or {{#when::...}}. #when is Risu's right-to-left stack evaluator:
// operators pop the stack and push '1'/'0' so chains compose. keep/legacy pass through.
function evalCondition(raw: string, scope: MacroScope): boolean {
  const t = raw.trim();
  if (t.startsWith("#if")) {
    return isTruthy(t.replace(/^#if(_pure)?\s*/i, ""));
  }
  if (t.startsWith("#when")) {
    const body = t.replace(/^#when/i, "").replace(/^(::|\s)/, "");
    if (!body.includes("::")) return isTruthy(body);
    const statement = body.split("::").map((s) => s.trim());
    const push = (b: boolean) => statement.push(b ? "1" : "0");
    while (statement.length > 1) {
      const condition = statement.pop() ?? "";
      const operator = statement.pop() ?? "";
      switch (operator) {
        case "not":
          push(!isTruthy(condition));
          break;
        case "keep":
        case "legacy":
          statement.push(condition);
          break;
        case "and":
          push(isTruthy(condition) && isTruthy(statement.pop() ?? ""));
          break;
        case "or":
          push(isTruthy(condition) || isTruthy(statement.pop() ?? ""));
          break;
        case "is":
          push(condition === (statement.pop() ?? ""));
          break;
        case "isnot":
          push(condition !== (statement.pop() ?? ""));
          break;
        case "var":
          push(isTruthy(scope.vars[condition] ?? ""));
          break;
        case "toggle":
          push(isTruthy(scope.globalVars?.[`toggle_${condition}`] ?? ""));
          break;
        case "vis":
          push((scope.vars[statement.pop() ?? ""] ?? "") === condition);
          break;
        case "visnot":
          push((scope.vars[statement.pop() ?? ""] ?? "") !== condition);
          break;
        case "tis":
          push(
            (scope.globalVars?.[`toggle_${statement.pop() ?? ""}`] ?? "") ===
              condition,
          );
          break;
        case "tisnot":
          push(
            (scope.globalVars?.[`toggle_${statement.pop() ?? ""}`] ?? "") !==
              condition,
          );
          break;
        case ">":
          push(parseFloat(statement.pop() ?? "") > parseFloat(condition));
          break;
        case "<":
          push(parseFloat(statement.pop() ?? "") < parseFloat(condition));
          break;
        case ">=":
          push(parseFloat(statement.pop() ?? "") >= parseFloat(condition));
          break;
        case "<=":
          push(parseFloat(statement.pop() ?? "") <= parseFloat(condition));
          break;
        default:
          // Unknown operator: drop it; stack shrinks each pass so the loop terminates.
          statement.push(condition);
          break;
      }
    }
    return isTruthy(statement[0] ?? "");
  }
  return isTruthy(t);
}

// Expand flat macros (no blocks) inside-out. Unknown macros are left verbatim
// by advancing a cursor past them so the loop always terminates.
function expandFlat(text: string, scope: MacroScope): string {
  const inner = /\{\{((?:(?!\{\{|\}\}).)*?)\}\}/s;
  let guard = 0;
  let cursor = 0;
  while (guard++ < MAX_RECURSION * 200) {
    const m = inner.exec(text.slice(cursor));
    if (!m) break;
    const at = cursor + m.index;
    const resolved = resolveMacro(m[1], scope);
    if (resolved === null) {
      cursor = at + m[0].length; // skip unknown, leave verbatim
      continue;
    }
    text = text.slice(0, at) + resolved + text.slice(at + m[0].length);
    // Re-scan from start: resolving an inner macro can complete an outer one opening before `at`.
    cursor = 0;
  }
  return text;
}

// Resolve the first conditional block, dropping the dead branch so its side
// effects never run. Chosen body left unexpanded for the outer loop; null when
// no well-formed block remains.
function resolveFirstBlock(text: string, scope: MacroScope): string | null {
  const start = text.search(/\{\{#(if|if_pure|when)\b/);
  if (start === -1) return null;
  // Find the closing }} of this opening tag, tracking nested {{...}} in the condition.
  let condEnd = -1;
  let braceDepth = 0;
  for (let j = start; j < text.length - 1; j++) {
    if (text[j] === "{" && text[j + 1] === "{") {
      braceDepth++;
      j++;
    } else if (text[j] === "}" && text[j + 1] === "}") {
      braceDepth--;
      j++;
      if (braceDepth === 0) {
        condEnd = j - 1;
        break;
      }
    }
  }
  if (condEnd === -1) return null;
  // Flat-expand the condition so {{#if {{getvar::x}}}} works.
  const condRaw = expandFlat(text.slice(start + 2, condEnd), scope);

  let depth = 1;
  let i = condEnd + 2;
  let elseAt = -1;
  let closeAt = -1;
  while (i < text.length && depth > 0) {
    const nextOpen = text.indexOf("{{#", i);
    const closeMatch = /\{\{\/(if|when)\}\}/.exec(text.slice(i));
    const closeIdx = closeMatch ? i + closeMatch.index : -1;
    if (closeIdx === -1) break;
    if (nextOpen !== -1 && nextOpen < closeIdx) {
      depth++;
      i = nextOpen + 3;
      continue;
    }
    if (depth === 1) {
      const elseIdx = text.indexOf("{{:else}}", i);
      if (elseIdx !== -1 && elseIdx < closeIdx) elseAt = elseIdx;
    }
    depth--;
    if (depth === 0) {
      closeAt = closeIdx;
      break;
    }
    i = closeIdx + 2;
  }
  if (closeAt === -1) return null;

  const bodyStart = condEnd + 2;
  const closeTagEnd = text.indexOf("}}", closeAt) + 2;
  const truthy = evalCondition(condRaw, scope);
  let chosen: string;
  if (elseAt !== -1 && elseAt > bodyStart && elseAt < closeAt) {
    chosen = truthy
      ? text.slice(bodyStart, elseAt)
      : text.slice(elseAt + "{{:else}}".length, closeAt);
  } else {
    chosen = truthy ? text.slice(bodyStart, closeAt) : "";
  }
  return text.slice(0, start) + chosen + text.slice(closeTagEnd);
}

export function expandMacros(text: string, scope: MacroScope): string {
  if (!text || !text.includes("{{")) return text;
  // Left-to-right so var writes are visible to later reads: expand prefix, resolve block, repeat.
  let out = "";
  let guard = 0;
  while (guard++ < MAX_RECURSION * 50) {
    const blockAt = text.search(/\{\{#(if|if_pure|when)\b/);
    if (blockAt === -1) break;
    // Expand everything before the block now so its setvars run first.
    out += expandFlat(text.slice(0, blockAt), scope);
    const rest = text.slice(blockAt);
    const resolved = resolveFirstBlock(rest, scope);
    if (resolved === null) {
      // Malformed block: emit it verbatim and stop block processing.
      text = rest;
      break;
    }
    // The chosen branch body may itself contain blocks/macros: re-process it.
    text = resolved;
  }
  return out + expandFlat(text, scope);
}
