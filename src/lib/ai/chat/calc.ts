// Isomorphic expression evaluator, RisuAI calcString port (infunctions.ts).
// Shunting-yard to RPN, no Function eval. Supports + - * / ^ % comparisons
// (< > <= >= == !=), logic (&& || !), parentheses, unary minus, $var (chat
// vars) and @var (global vars) substitution, null -> 0.

type VarLookup = (name: string) => string;

// Deterministic [0,1) keyed on a string: djb2 fold -> sfc32 PRNG (RisuAI
// pickHashRand analog). One shared source for macro rolls, @@probability, and
// group-order talkness so determinism semantics stay uniform.
export function seededRand(key: string): number {
  let h = 5515;
  for (let i = 0; i < key.length; i++)
    h = ((h << 5) + h + key.charCodeAt(i)) | 0;
  let a = h >>> 0;
  let b = h >>> 0;
  let c = h >>> 0;
  let d = h >>> 0;
  let t = (a + b) | 0;
  a = b ^ (b >>> 9);
  b = (c + (c << 3)) | 0;
  c = (c << 21) | (c >>> 11);
  d = (d + 1) | 0;
  t = (t + d) | 0;
  c = (c + t) | 0;
  return (t >>> 0) / 4294967296;
}

const OPERATORS: Record<string, { precedence: number; right: boolean }> = {
  "+": { precedence: 2, right: false },
  "-": { precedence: 2, right: false },
  "*": { precedence: 3, right: false },
  "/": { precedence: 3, right: false },
  "^": { precedence: 4, right: false },
  "%": { precedence: 3, right: false },
  "<": { precedence: 1, right: false },
  ">": { precedence: 1, right: false },
  "|": { precedence: 1, right: false },
  "&": { precedence: 1, right: false },
  "≤": { precedence: 1, right: false },
  "≥": { precedence: 1, right: false },
  "=": { precedence: 1, right: false },
  "≠": { precedence: 1, right: false },
  "!": { precedence: 5, right: true },
};

function toRPN(expression: string): string[] {
  const output: string[] = [];
  const stack: string[] = [];
  const keys = Object.keys(OPERATORS);

  // Tokenize, honoring unary minus after an operator or at the start.
  const tokens: string[] = [];
  let cur = "";
  for (let i = 0; i < expression.length; i++) {
    const ch = expression[i];
    if (ch === "-" && (i === 0 || keys.includes(expression[i - 1]))) {
      cur += ch;
    } else if (keys.includes(ch)) {
      tokens.push(cur !== "" ? cur : "0");
      cur = "";
      tokens.push(ch);
    } else {
      cur += ch;
    }
  }
  tokens.push(cur !== "" ? cur : "0");

  for (const token of tokens) {
    if (parseFloat(token) || token === "0") {
      output.push(token);
    } else if (keys.includes(token)) {
      const op = OPERATORS[token];
      while (stack.length > 0) {
        const top = OPERATORS[stack[stack.length - 1]];
        if (
          (!op.right && op.precedence <= top.precedence) ||
          (op.right && op.precedence < top.precedence)
        ) {
          output.push(stack.pop()!);
        } else break;
      }
      stack.push(token);
    }
  }
  while (stack.length > 0) output.push(stack.pop()!);
  return output;
}

function calculateRPN(rpn: string[]): number {
  const stack: number[] = [];
  for (const token of rpn) {
    if (parseFloat(token) || token === "0") {
      stack.push(parseFloat(token));
      continue;
    }
    const b = stack.pop() ?? 0;
    const a = stack.pop() ?? 0;
    switch (token) {
      case "+": stack.push(a + b); break;
      case "-": stack.push(a - b); break;
      case "*": stack.push(a * b); break;
      case "/": stack.push(a / b); break;
      case "^": stack.push(a ** b); break;
      case "%": stack.push(a % b); break;
      case "<": stack.push(a < b ? 1 : 0); break;
      case ">": stack.push(a > b ? 1 : 0); break;
      case "|": stack.push(a || b); break;
      case "&": stack.push(a && b); break;
      case "≤": stack.push(a <= b ? 1 : 0); break;
      case "≥": stack.push(a >= b ? 1 : 0); break;
      case "=": stack.push(a === b ? 1 : 0); break;
      case "≠": stack.push(a !== b ? 1 : 0); break;
      case "!": stack.push(b ? 0 : 1); break;
    }
  }
  if (stack.length === 0) return 0;
  return stack.pop()!;
}

function substituteVars(
  text: string,
  chatVar?: VarLookup,
  globalVar?: VarLookup,
): string {
  return text
    .replace(/\$([a-zA-Z0-9_]+)/g, (_, name: string) => {
      const v = parseFloat(chatVar?.(name) ?? "");
      return Number.isNaN(v) ? "0" : v.toString();
    })
    .replace(/@([a-zA-Z0-9_]+)/g, (_, name: string) => {
      const v = parseFloat(globalVar?.(name) ?? "");
      return Number.isNaN(v) ? "0" : v.toString();
    })
    .replace(/&&/g, "&")
    .replace(/\|\|/g, "|")
    .replace(/<=/g, "≤")
    .replace(/>=/g, "≥")
    .replace(/==/g, "=")
    .replace(/!=/g, "≠")
    .replace(/null/gi, "0");
}

function executeRPN(
  text: string,
  chatVar?: VarLookup,
  globalVar?: VarLookup,
): number {
  return calculateRPN(toRPN(substituteVars(text, chatVar, globalVar)));
}

const MAX_CALC_LEN = 1000;

// Risu calcString: innermost parens evaluated first, result spliced back.
export function calcString(
  text: string,
  opts: { chatVar?: VarLookup; globalVar?: VarLookup } = {},
): number {
  const cleaned = text.replace(/\s+/g, "");
  if (!cleaned || cleaned.length > MAX_CALC_LEN) return NaN;
  const depthText: string[] = [""];
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === "(") {
      depthText.push("");
    } else if (cleaned[i] === ")" && depthText.length > 1) {
      const result = executeRPN(depthText.pop()!, opts.chatVar, opts.globalVar);
      depthText[depthText.length - 1] += result;
    } else {
      depthText[depthText.length - 1] += cleaned[i];
    }
  }
  return executeRPN(depthText.join(""), opts.chatVar, opts.globalVar);
}
