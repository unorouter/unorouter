    // Isomorphic regex-script engine (RisuAI processScriptFull port). Server runs editprocess/editinput, client runs editoutput/editdisplay.

export type RegexScriptMode =
  | "editinput" // user input before send
  | "editoutput" // model output after generation
  | "editprocess" // history messages before send
  | "editdisplay"; // render-time only

export type RegexScript = {
  // Match pattern (regex source).
  in: string;
      // Replacement template: $1..$n groups, $& whole match, {{data}} re-inserts the match. @@-prefixed values are actions.
  out: string;
  type: RegexScriptMode;
  // Custom regex flags + `<meta>` brackets (<order N>, <cbs>, action names).
  flag?: string;
      // RisuAI semantics: true uses the custom flag string, false defaults 'g'. NOT an enable toggle; scripts always run.
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

// Strip `<...>` meta brackets from the flag string, collecting `order N` + action names.
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

    // Risu flag normalization: strip unsupported chars, dedupe, empty becomes 'u'. move_top/move_bottom drop 'g'.
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

    // $N refs, $& whole match, $$N literal. No lookbehind: WebKit <16.4 rejects it at parse and bricks the chunk.
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

// Replace all matches expanding group refs, then optional CBS re-parse (Risu parity).
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

    // Parse memo keyed by array identity: applyRegexScripts reuses the same scripts array per message, so don't re-parse flag meta.
const PARSED_CACHE = new WeakMap<
  RegexScript[],
  Map<RegexScriptMode, ParsedScript[]>
>();

function parsedFor(
  scripts: RegexScript[],
  mode: RegexScriptMode,
): ParsedScript[] {
  let byMode = PARSED_CACHE.get(scripts);
  if (!byMode) {
    byMode = new Map();
    PARSED_CACHE.set(scripts, byMode);
  }
  let parsed = byMode.get(mode);
  if (!parsed) {
    parsed = scripts
      .filter((s) => s.type === mode && s.in !== "")
      .map(parseScriptMeta);
    if (parsed.some((p) => p.order !== 0)) {
      parsed.sort((a, b) => b.order - a.order);
    }
    byMode.set(mode, parsed);
  }
  return parsed;
}

    // User-authored regex runs server-side; a pathological pattern backtracks and stalls the event loop for ALL requests, so skip oversized strings (100k).
const MAX_REGEX_INPUT = 100_000;

    // Catastrophic-backtracking detector: flags nested unbounded quantifiers. Kept broad since false negatives are the real danger.
const NESTED_QUANTIFIER_RE =
  /\([^()]*(?:[+*]|\{\d+,\})[^()]*\)\s*(?:[+*]|\{\d+,\})/;

function isReDoSProne(pattern: string): boolean {
  return NESTED_QUANTIFIER_RE.test(pattern);
}

export function runRegexScripts(
  text: string,
  scripts: RegexScript[],
  mode: RegexScriptMode,
  opts: RunRegexOpts = {},
): string {
  const parsed = parsedFor(scripts, mode);

  let data = text;
  for (const p of parsed) {
    if (data.length > MAX_REGEX_INPUT) break;
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
      // Risu: $n becomes newline, then {{data}} becomes $&. Function replacement since a plain $& string is special in String.replace.
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
  if (isReDoSProne(input)) {
        // Nested unbounded quantifier: catastrophic-backtracking risk. Skip the whole script rather than run it.
    throw new Error("regex-redos-skip");
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
          // Risu strips the match from the outgoing copy; that strip is the isomorphic part.
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
        // Unknown @@ action with a match: Risu falls through to a plain replace + CBS re-parse.
    return plainReplace(data, reg, outScript, opts.expand);
  }

      // No match: @@repeat_back copies the matched part of the previous same-role message onto this one.
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
