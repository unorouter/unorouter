// exampleMessages string -> role-tagged few-shot turns (RisuAI parity).
// <START> / [Start a new chat] separate blocks; {{char}}:/{{user}}:/<bot>:/<user>:
// prefix lines, bare lines continue the turn. Caller macro-expands.

type ExampleTurn = {
  role: "system" | "user" | "assistant";
  text: string;
};

const START_LINE = /^(?:<start>|\[start a new chat\])\s*$/i;
const USER_PREFIX = /^(?:\{\{user\}\}|<user>)\s*:\s*/i;
const CHAR_PREFIX = /^(?:\{\{char\}\}|<bot>|<char>)\s*:\s*/i;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseExampleMessages(
  raw: string | null | undefined,
  charName?: string,
): ExampleTurn[] {
  if (!raw || !raw.trim()) return [];
  // Risu also opens a char turn on the literal `CharName:` prefix.
  const namePrefix =
    charName && charName.trim()
      ? new RegExp(`^${escapeRegex(charName.trim())}\\s*:\\s*`, "i")
      : null;
  const out: ExampleTurn[] = [];
  let cur: ExampleTurn | null = null;

  const flush = () => {
    if (cur && cur.text.trim()) out.push({ ...cur, text: cur.text.trim() });
    cur = null;
  };

  for (const rawLine of raw.split("\n")) {
    const line = rawLine.trimEnd();
    if (START_LINE.test(line.trim())) {
      flush();
      out.push({ role: "system", text: "[Start a new chat]" });
      continue;
    }
    let m = USER_PREFIX.exec(line);
    if (m) {
      flush();
      cur = { role: "user", text: line.slice(m[0].length) };
      continue;
    }
    m = CHAR_PREFIX.exec(line) ?? namePrefix?.exec(line) ?? null;
    if (m) {
      flush();
      cur = { role: "assistant", text: line.slice(m[0].length) };
      continue;
    }
    // Bare line: continuation of the current turn (or ignored if none open).
    if (cur) cur.text += (cur.text ? "\n" : "") + line;
  }
  flush();
  return out;
}
