// Isomorphic regex-script engine (RisuAI customscript / SillyTavern regex
// parity, scripts.ts processScriptFull port). Runs on the server
// (editprocess/editinput during assembly) and the client (editoutput/
// editdisplay on streamed output + render). No server-only imports.

export type RegexScriptMode =
  | "editinput" // user input before send
  | "editoutput" // model output after generation
  | "editprocess" // history messages before send
  | "editdisplay"; // render-time only

export type RegexScript = {
  // Match pattern (regex source).
  in: string;
  // Replacement template. `$1`..`$n` group refs; `$&` whole match; `{{data}}`
  // re-inserts the match. `@@`-prefixed values are actions.
  out: string;
  type: RegexScriptMode;
  // Custom regex flags + `<meta>` brackets (<order N>, <cbs>, action names).
  flag?: string;
  // RisuAI semantics: true = use the custom `flag` string; false = default 'g'.
  // It is NOT an enable/disable toggle - scripts always run.
  ableFlag?: boolean;
};

export type RunRegexOpts = {
  // CBS macro expansion hook for <cbs> patterns and post-replace parsing.
  expand?: (s: string) => string;
  // Previous same-role message text, for @@repeat_back.
  prevSameRole?: string;
};

type ParsedScript = {
  script: RegexScript;
  order: number;
  actions: string[];
  // Regex flags with `<...>` meta stripped.
  rawFlag: string;
};

// Strip `<...>` meta brackets out of the flag string, collecting `order N` and
// action names (Risu scripts.ts:298-330; brackets support comma lists).
function parseScriptMeta(script: RegexScript): ParsedScript {
  let order = 0;
  const actions: string[] = [];
  let rawFlag = script.ableFlag ? script.flag || "g" : "g";
  rawFlag = rawFlag.replace(/<(.+?)>/g, (_, p1: string) => {
    for (const m of p1.split(",").map((v) => v.trim())) {
      if (m.startsWith("order ")) {
        const n = parseInt(m.substring(6));
        if (!Number.isNaN(n)) order = n;
      } else if (m) {
        actions.push(m);
      }
    }
    return "";
  });
  return { script, order, actions, rawFlag };
}

// Risu flag normalization: strip unsupported chars, dedupe, empty -> 'u'.
// move_top/move_bottom drop 'g' (Risu "temporary fix": single match moves).
function normalizeFlag(p: ParsedScript, outScript: string): string {
  let flag = p.rawFlag;
  if (
    outScript.startsWith("@@move_top") ||
    outScript.startsWith("@@move_bottom") ||
    p.actions.includes("move_top") ||
    p.actions.includes("move_bottom")
  ) {
    flag = flag.replace("g", "");
  }
  flag = flag.trim().replace(/[^dgimsuvy]/g, "");
  flag = flag
    .split("")
    .filter((v, i, a) => a.indexOf(v) === i)
    .join("");
  if (flag.length === 0) flag = "u";
  return flag;
}

// Group-ref expansion against a match array (Risu move_* replacement rules):
// `$N` positional refs, `$&` whole match, `$$N` stays literal. Single pass, no
// lookbehind: this module runs client-side and WebKit <16.4 rejects lookbehind
// at parse time, which would brick every chunk bundled with it.
function expandRefs(template: string, match: RegExpMatchArray): string {
  return template.replace(/\$\$[0-9]+|\$([0-9]+)|\$&/g, (m, idx) => {
    if (m.startsWith("$$")) return m; // escaped, stays verbatim
    if (idx !== undefined) {
      const index = parseInt(idx);
      return index < match.length ? (match[index] ?? "") : m;
    }
    return match[0] ?? ""; // $&
  });
}

// Plain replacement over all matches, expanding group refs, then an optional
// CBS re-parse of the result (Risu replaces then risuChatParser's the data).
function plainReplace(
  data: string,
  reg: RegExp,
  outScript: string,
  expand?: (s: string) => string,
): string {
  const replaced = data.replace(reg, (...args) => {
    const offsetIdx = args.findIndex((a) => typeof a === "number");
    const m = args.slice(
      0,
      offsetIdx === -1 ? args.length : offsetIdx,
    ) as unknown as RegExpMatchArray;
    return expandRefs(outScript, m);
  });
  return expand ? expand(replaced) : replaced;
}

// Run all scripts of a given mode over a single string. Honors <order N>
// (higher first), `{{data}}` -> `$&`, `$n` -> newline, the `>`-suffix newline
// rule, and the @@ actions (emo/inject/move_top/move_bottom/repeat_back).
export function runRegexScripts(
  text: string,
  scripts: RegexScript[],
  mode: RegexScriptMode,
  opts: RunRegexOpts = {},
): string {
  const parsed = scripts
    .filter((s) => s.type === mode && s.in !== "")
    .map(parseScriptMeta);
  const orderChanged = parsed.some((p) => p.order !== 0);
  if (orderChanged) parsed.sort((a, b) => b.order - a.order);

  let data = text;
  for (const p of parsed) {
    try {
      data = executeScript(data, p, opts);
    } catch {
      // Bad pattern or runaway template: skip this script (Risu logs + skips).
    }
  }
  return data;
}

function executeScript(
  data: string,
  p: ParsedScript,
  opts: RunRegexOpts,
): string {
  const script = p.script;
  // Risu: $n -> newline first, then {{data}} -> $& (whole-match re-insert).
  // Function replacement: a plain "$&" string is special in String.replace.
  let outScript = script.out
    .replaceAll("$n", "\n")
    .replace(/\{\{data\}\}/g, () => "$&");
  if (outScript.endsWith(">") && !p.actions.includes("no_end_nl")) {
    outScript += "\n";
  }
  const flag = normalizeFlag(p, outScript);

  let input = script.in;
  if (p.actions.includes("cbs") && opts.expand) {
    input = opts.expand(input);
  }
  const reg = new RegExp(input, flag);

  const isAction = outScript.startsWith("@@") || p.actions.length > 0;
  if (!isAction) return plainReplace(data, reg, outScript, opts.expand);

  if (reg.test(data)) {
    if (outScript.startsWith("@@emo ")) {
      // Emotion side effect only; Risu leaves the text untouched.
      return data;
    }
    if (outScript.startsWith("@@inject") || p.actions.includes("inject")) {
      // Risu writes the text back to the stored message and strips the match
      // from the outgoing copy; the strip is the isomorphic part.
      return data.replace(reg, "");
    }
    if (
      outScript.startsWith("@@move_top") ||
      outScript.startsWith("@@move_bottom") ||
      p.actions.includes("move_top") ||
      p.actions.includes("move_bottom")
    ) {
      const isGlobal = flag.includes("g");
      const matchAll = isGlobal ? [...data.matchAll(reg)] : [data.match(reg)];
      let stripped = data.replace(reg, "");
      for (const matched of matchAll) {
        if (!matched) continue;
        const tail = outScript
          .replace("@@move_top ", "")
          .replace("@@move_bottom ", "")
          .replace(/^@@move_top$/, "")
          .replace(/^@@move_bottom$/, "");
        const out = tail ? expandRefs(tail, matched) : matched[0];
        if (
          outScript.startsWith("@@move_top") ||
          p.actions.includes("move_top")
        ) {
          stripped = out + "\n" + stripped;
        } else {
          stripped = stripped + "\n" + out;
        }
      }
      return stripped;
    }
    // Unknown @@ action with a match: Risu falls through to a plain replace
    // + CBS re-parse.
    return plainReplace(data, reg, outScript, opts.expand);
  }

  // No match: @@repeat_back copies the matched part of the previous same-role
  // message onto this one (Risu scripts.ts:252-287).
  if (
    (outScript.startsWith("@@repeat_back") ||
      p.actions.includes("repeat_back")) &&
    opts.prevSameRole
  ) {
    const variant = outScript.split(" ", 2)[1];
    const r = opts.prevSameRole.match(reg);
    if (!r || !r[0]) return data;
    switch (variant) {
      case "start":
        return r[0] + data;
      case "end_nl":
        return data + "\n" + r[0];
      case "start_nl":
        return r[0] + "\n" + data;
      case "end":
      default:
        return data + r[0];
    }
  }
  return data;
}

// Parse a stored scripts JSON column (loose) into typed RegexScripts.
export function parseRegexScripts(raw: unknown): RegexScript[] {
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
  const out: RegexScript[] = [];
  for (const c of arr) {
    if (!c || typeof c !== "object") continue;
    const o = c as Record<string, unknown>;
    if (typeof o.in !== "string" || typeof o.out !== "string") continue;
    const type = o.type;
    if (
      type !== "editinput" &&
      type !== "editoutput" &&
      type !== "editprocess" &&
      type !== "editdisplay"
    ) {
      continue;
    }
    out.push({
      in: o.in,
      out: o.out,
      type,
      flag: typeof o.flag === "string" ? o.flag : undefined,
      ableFlag: o.ableFlag === true,
    });
  }
  return out;
}
