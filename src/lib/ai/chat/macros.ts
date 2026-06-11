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
  // Newest last, for the {{history}}/{{lastmessage}} family. `time` is the
  // message createdAt (unix ms) for the message_time/date/idle macros.
  history?: {
    role: "user" | "assistant" | "system";
    text: string;
    time?: number;
  }[];
  // Per-conv seed so roll/random/pick resolve identically across regenerates (RisuAI determinism).
  seed?: string;
  // Browser environment (client-sent): screen_width/height + locale-faithful
  // time formatting. Absent in tokenize/fallback paths.
  viewport?: { w: number; h: number };
  locale?: string;
  timeZone?: string;
  // Greeting state for {{previous_char_chat}} fallback + {{first_msg_index}}.
  firstMessage?: string;
  alternateGreetings?: string[];
  fmIndex?: number;
  exampleMessage?: string; // {{example_dialogue}}
  lorebooks?: unknown[]; // {{lorebook}}/{{worldinfo}} JSON reader
  triggerId?: string; // {{trigger_id}} when expanding inside a trigger
  prefillSupported?: boolean; // {{prefill_supported}}
  // Index of the message being expanded (Risu chatID); undefined = field
  // context (chatID -1) so message_time family returns the error strings.
  chatIndex?: number;
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
  charpersona: "personality",
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

// Risu parseArray: JSON array or `§`-separated fallback.
function parseArray(p1: string): unknown[] {
  try {
    const arr: unknown = JSON.parse(p1);
    if (Array.isArray(arr)) return arr;
    return p1.split("§");
  } catch {
    return p1.split("§");
  }
}

// Risu trimLines: strip per-line leading whitespace, trim the whole.
function trimLines(p1: string): string {
  return p1
    .split("\n")
    .map((v) => v.trimStart())
    .join("\n")
    .trim();
}

// Risu risuEscape/risuUnescape: {}() to private-use chars; protects #escape
// content through later processing, un-mapped at request build.
export function risuEscape(text: string): string {
  return text.replace(/[{}()]/g, (f) => {
    switch (f) {
      case "{":
        return "\uE9B8";
      case "}":
        return "\uE9B9";
      case "(":
        return "\uE9BA";
      default:
        return "\uE9BB";
    }
  });
}

const UNESCAPE_MAP = ["{", "}", "(", ")"];
export function risuUnescape(text: string): string {
  return text.replace(/[\uE9B8-\uE9BF]/g, (f) =>
    String(UNESCAPE_MAP[f.charCodeAt(0) - 0xe9b8] ?? f),
  );
}

// Risu messageIdleDuration format: H+:MM:SS, all zero-padded.
function hmsPad(totalMs: number): string {
  const totalSec = Math.floor(Math.max(0, totalMs) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const NO_TIME = "[Cannot get time]";
const OLD_VERSION_TIME = "[Cannot get time, message was sent in older version]";

// toLocale* with the browser-sent locale + timeZone (Risu runs in-browser).
function localeTime(ms: number, scope: MacroScope): string {
  return new Date(ms).toLocaleTimeString(scope.locale, {
    timeZone: scope.timeZone,
  });
}
function localeDate(ms: number, scope: MacroScope): string {
  return new Date(ms).toLocaleDateString(scope.locale, {
    timeZone: scope.timeZone,
  });
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
    case "previoususerchat":
      return (
        [...(scope.history ?? [])].reverse().find((m) => m.role === "user")
          ?.text ?? ""
      );
    case "lastcharmessage":
    case "previouscharchat": {
      const found = [...(scope.history ?? [])]
        .reverse()
        .find((m) => m.role === "assistant");
      if (found) return found.text;
      // Risu: no char message yet -> the greeting being shown.
      const fm = scope.fmIndex ?? -1;
      return fm >= 0
        ? (scope.alternateGreetings?.[fm] ?? scope.firstMessage ?? "")
        : (scope.firstMessage ?? "");
    }
    case "lastmessageid":
    case "lastmessageindex":
      return String((scope.history?.length ?? 0) - 1);
    case "previouschatlog":
      return scope.history?.[Number(arg0)]?.text ?? "Out of range";
    case "history":
    case "messages":
      return (scope.history ?? []).map((m) => m.text).join("\n");
    // Risu returns these as JSON arrays, not joined text.
    case "userhistory":
    case "usermessages":
      return JSON.stringify(
        (scope.history ?? [])
          .filter((m) => m.role === "user")
          .map((m) => m.text),
      );
    case "charhistory":
    case "charmessages":
      return JSON.stringify(
        (scope.history ?? [])
          .filter((m) => m.role === "assistant")
          .map((m) => m.text),
      );
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

    // ---- per-message time family (Risu cbs.ts message_time/...) ----
    case "messagetime": {
      const idx = scope.chatIndex ?? -1;
      if (idx < 0) return NO_TIME;
      const t = scope.history?.[idx]?.time;
      return t == null ? OLD_VERSION_TIME : localeTime(t, scope);
    }
    case "messagedate": {
      const idx = scope.chatIndex ?? -1;
      if (idx < 0) return NO_TIME;
      const t = scope.history?.[idx]?.time;
      return t == null ? OLD_VERSION_TIME : localeDate(t, scope);
    }
    case "messageidleduration": {
      const users = (scope.history ?? []).filter((m) => m.role === "user");
      if (users.length < 2) return "[No user message found]";
      const last = users[users.length - 1];
      const prev = users[users.length - 2];
      if (last.time == null || prev.time == null) return OLD_VERSION_TIME;
      return hmsPad(last.time - prev.time);
    }
    case "idleduration": {
      const last = scope.history?.at(-1);
      if (!last) return "00:00:00";
      if (last.time == null) return OLD_VERSION_TIME;
      return hmsPad(Date.now() - last.time);
    }
    case "messageunixtimearray":
      return JSON.stringify((scope.history ?? []).map((m) => `${m.time ?? 0}`));

    // ---- greeting / card data readers ----
    case "firstmessageindex":
    case "firstmsgindex":
      return String(scope.fmIndex ?? -1);
    case "exampledialogue":
    case "examplemessage":
      return scope.exampleMessage ?? "";
    case "lorebook":
    case "worldinfo":
      return JSON.stringify(scope.lorebooks ?? []);
    case "role": {
      const idx = scope.chatIndex ?? -1;
      const r = idx >= 0 ? scope.history?.[idx]?.role : undefined;
      return r ? (r === "assistant" ? "char" : r) : "null";
    }

    // ---- environment / introspection ----
    case "screenwidth":
      return String(scope.viewport?.w ?? 0);
    case "screenheight":
      return String(scope.viewport?.h ?? 0);
    case "triggerid":
      return scope.triggerId ?? "null";
    case "axmodel":
      // No aux-model setting; closest analog is the active model.
      return scope.model ?? "";
    case "prefillsupported":
    case "prefill_supported":
      return scope.prefillSupported ? "1" : "0";
    case "file": {
      // {{file::name::base64}}: decode to utf-8 (display wrapper is client-side).
      const b64 = args[1]?.trim() ?? "";
      try {
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        return new TextDecoder().decode(bytes);
      } catch {
        return "";
      }
    }
    case "return":
      scope.vars["__return__"] = arg0;
      scope.vars["__force_return__"] = "1";
      return "";
    // Doc-only in Risu; consumed by other features. Resolve empty, never leak.
    case "slot":
    case "position":
      return "";

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
      "blank none asset assetlist emotion emotionlist image img audio video videoimg bg bgm inlay inlayed inlayeddata path source button risu ruby furigana katex latex chardisplayasset moduleassetlist".split(
        " ",
      ),
    ],
    // App-coupled boolean probes -> "0".
    ["0", "moduleenabled jbtoggled isfirstmsg isfirstmessage".split(" ")],
  ];
  for (const [value, names] of groups) for (const n of names) out[n] = value;
  return out;
})();

// {{#if cond}} or {{#when::...}}. #when is Risu's right-to-left stack evaluator:
// operators pop the stack and push '1'/'0' so chains compose. keep/legacy pass through.
function evalCondition(raw: string, scope: MacroScope): boolean {
  const t = raw.trim();
  if (t.startsWith("#if")) {
    // Risu p1.split(' ', 2)[1]: only the FIRST token is the condition.
    const state = t.replace(/^#if(_pure)?\s*/i, "").split(" ", 1)[0] ?? "";
    return isTruthy(state);
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
    // {{return}}: exit expansion immediately; the remainder is dropped (Risu
    // __force_return__ exits the parser with what accumulated so far).
    if (scope.vars["__force_return__"] === "1") {
      return text.slice(0, at) + resolved;
    }
    text = text.slice(0, at) + resolved + text.slice(at + m[0].length);
    // Re-scan from start: resolving an inner macro can complete an outer one opening before `at`.
    cursor = 0;
  }
  return text;
}

// Block engine (Risu parser.svelte.ts blockStartMatcher/blockEndMatcher).
// Any {{/...}} closes the innermost open block (Risu pops the stack by
// position, not by name). pure-ish bodies are captured raw.
const BLOCK_OPEN_RE =
  /\{\{#(if_pure|if|when|each|pure_display|puredisplay|pure|escape)\b/;

type BlockResult = {
  // Emit verbatim (pure/puredisplay/escape/when: already fully processed).
  raw?: string;
  // Remaining text to keep processing (reinjected body + tail).
  rest: string;
};

// Find the end of the opening {{#...}} tag, tracking nested {{...}} in args.
function findTagEnd(text: string, start: number): number {
  let depth = 0;
  for (let j = start; j < text.length - 1; j++) {
    if (text[j] === "{" && text[j + 1] === "{") {
      depth++;
      j++;
    } else if (text[j] === "}" && text[j + 1] === "}") {
      depth--;
      j++;
      if (depth === 0) return j - 1;
    }
  }
  return -1;
}

// Find the matching close tag: {{#...}} pushes, {{/...}} (not {{//}}) pops.
function findBlockClose(
  text: string,
  from: number,
): { closeAt: number; closeEnd: number } | null {
  let depth = 1;
  let i = from;
  while (i < text.length - 2) {
    const open = text.indexOf("{{#", i);
    const close = text.indexOf("{{/", i);
    if (close === -1) return null;
    if (text.startsWith("{{//", close)) {
      // Comment macro, not a close tag.
      i = close + 4;
      continue;
    }
    if (open !== -1 && open < close) {
      depth++;
      i = open + 3;
      continue;
    }
    depth--;
    if (depth === 0) {
      const closeEnd = text.indexOf("}}", close);
      if (closeEnd === -1) return null;
      return { closeAt: close, closeEnd: closeEnd + 2 };
    }
    i = close + 3;
  }
  return null;
}

// Risu newif (#when) else handling: line-based for multiline bodies.
function applyWhenElse(body: string, truthy: boolean, keep: boolean): string {
  const lines = body.split("\n");
  let result: string;
  if (lines.length === 1) {
    const elseIndex = body.indexOf("{{:else}}");
    if (elseIndex !== -1) {
      result = truthy
        ? body.substring(0, elseIndex)
        : body.substring(elseIndex + 9);
    } else {
      result = truthy ? body : "";
    }
  } else {
    const elseLine = lines.findIndex((v) => v.trim() === "{{:else}}");
    if (elseLine !== -1 && truthy) lines.splice(elseLine);
    else if (elseLine !== -1 && !truthy) lines.splice(0, elseLine + 1);
    else if (elseLine === -1 && !truthy) return "";
    result = lines.join("\n");
  }
  return keep ? result : trimLines(result);
}

// Resolve the first block in `text` (which starts at the block opener).
// Returns null when malformed (caller emits verbatim).
function resolveFirstBlock(
  text: string,
  scope: MacroScope,
  depth: number,
): BlockResult | null {
  const tagEnd = findTagEnd(text, 0);
  if (tagEnd === -1) return null;
  // Inner macros in the tag resolve first (Risu char-walk order).
  const tag = expandFlat(text.slice(2, tagEnd), scope);
  const closeInfo = findBlockClose(text, tagEnd + 2);
  if (!closeInfo) return null;
  const body = text.slice(tagEnd + 2, closeInfo.closeAt);
  const tail = text.slice(closeInfo.closeEnd);

  if (tag.startsWith("#if")) {
    const pure = tag.startsWith("#if_pure");
    if (!evalCondition(tag, scope)) return { raw: "", rest: tail };
    // Truthy: body processed; #if trims (Risu 'parse'), #if_pure keeps verbatim.
    const expanded = expandBlocks(body, scope, depth + 1);
    return { raw: pure ? expanded : trimLines(expanded.trim()), rest: tail };
  }

  if (tag.startsWith("#when")) {
    const truthy = evalCondition(tag, scope);
    const keep = /(^|::|\s)keep(::|\s|$)/.test(tag.slice(5));
    // Risu newif bodies are NOT pure: both branches expand (side effects run),
    // then the else split cuts the text.
    const expanded = expandBlocks(body, scope, depth + 1);
    return { raw: applyWhenElse(expanded, truthy, keep), rest: tail };
  }

  if (tag === "#pure") {
    return { raw: body, rest: tail };
  }

  if (tag === "#pure_display" || tag === "#puredisplay") {
    return {
      raw: body.replaceAll("{{", "\\{\\{").replaceAll("}}", "\\}\\}"),
      rest: tail,
    };
  }

  if (tag.startsWith("#escape")) {
    const keep = tag.slice(7).trim() === "::keep";
    return { raw: risuEscape(keep ? body : body.trim()), rest: tail };
  }

  if (tag.startsWith("#each")) {
    let arg = tag.slice(5).trim();
    let mode: "keep" | undefined;
    if (arg.startsWith("::keep ")) {
      mode = "keep";
      arg = arg.slice(7).trim();
    }
    if (arg.startsWith("as ")) arg = arg.slice(3).trim();
    const asIndex = arg.lastIndexOf(" as ");
    let sub: string;
    let arrExpr: string;
    if (asIndex === -1) {
      // Compatibility mode: last space-separated token is the var name.
      const subind = arg.lastIndexOf(" ");
      if (subind === -1) return { raw: "", rest: tail };
      sub = arg.slice(subind + 1);
      arrExpr = arg.slice(0, subind);
    } else {
      sub = arg.slice(asIndex + 4).trim();
      arrExpr = arg.slice(0, asIndex);
    }
    const array = parseArray(arrExpr);
    const piece = mode === "keep" ? body : trimLines(body.trim());
    let added = "";
    for (const el of array) {
      added += piece.replaceAll(
        `{{slot::${sub}}}`,
        typeof el === "string" ? el : JSON.stringify(el),
      );
    }
    // Reinject: slot-substituted bodies re-enter the stream (Risu splices into da).
    return { rest: (mode === "keep" ? added : added.trim()) + tail };
  }

  return null;
}

// Left-to-right block resolution; depth caps runaway reinjection.
function expandBlocks(text: string, scope: MacroScope, depth: number): string {
  if (depth > MAX_RECURSION) return text;
  let out = "";
  let guard = 0;
  while (guard++ < MAX_RECURSION * 50) {
    if (scope.vars["__force_return__"] === "1") return out;
    const blockAt = text.search(BLOCK_OPEN_RE);
    if (blockAt === -1) break;
    out += expandFlat(text.slice(0, blockAt), scope);
    const rest = text.slice(blockAt);
    const r = resolveFirstBlock(rest, scope, depth);
    if (r === null) {
      // Malformed block: emit verbatim, stop block processing.
      text = rest;
      break;
    }
    if (r.raw !== undefined) {
      out += r.raw;
      text = r.rest;
    } else {
      text = r.rest;
    }
  }
  return out + expandFlat(text, scope);
}

export function expandMacros(text: string, scope: MacroScope): string {
  if (!text || !text.includes("{{")) return text;
  return expandBlocks(text, scope, 0);
}
