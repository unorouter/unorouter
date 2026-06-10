// Build-time guard for the client message prune (src/i18n/client-messages.ts).
// Scans every "use client" file for literal translation keys and fails the
// build when one resolves into a pruned subtree: that key would render as a
// silent MISSING_MESSAGE console error in prod (the bug class this prevents).
// Dynamic keys (t(variable)) are invisible to this check by design.
import { readdir, readFile } from "node:fs/promises";
import { isClientMessageKey } from "../src/i18n/client-messages";
import en from "../public/i18n/en.json";

// tsc runs without Bun globals; plain fs walk keeps the build typecheck green.
async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) yield* walk(path);
    else if (/\.(ts|tsx)$/.test(entry.name)) yield path;
  }
}

// `const t = useTranslations("NS")` (or no namespace). Each translator
// variable is scanned for literal keys and resolved against its namespace.
const TRANSLATOR_RE =
  /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*useTranslations\(\s*(?:["'`]([A-Za-z0-9_.]+)["'`])?\s*\)/g;

function existsInMessages(key: string): boolean {
  let node: unknown = en;
  for (const segment of key.split(".")) {
    if (typeof node !== "object" || node === null) return false;
    node = (node as Record<string, unknown>)[segment];
    if (node === undefined) return false;
  }
  return true;
}

function isClientFile(content: string): boolean {
  // "use client" must appear before any code; checking the first few lines
  // tolerates leading comments.
  return content
    .split("\n", 5)
    .some((line) => /^\s*["']use client["']/.test(line));
}

const violations: string[] = [];

for await (const file of walk("src")) {
  const content = await readFile(file, "utf8");
  if (!isClientFile(content)) continue;

  for (const translator of content.matchAll(TRANSLATOR_RE)) {
    const varName = translator[1];
    const ns = translator[2];
    const keyRe = new RegExp(
      `\\b${varName}(?:\\.(?:rich|markup|has))?\\(\\s*["'\`]([A-Za-z0-9_.]+)["'\`]`,
      "g",
    );
    for (const match of content.matchAll(keyRe)) {
      const literal = match[1];
      const key = ns ? `${ns}.${literal}` : literal;
      // Only keys that exist in en.json count; missing keys are next-intl's
      // own problem (and fail the precompile), not the prune's.
      if (!existsInMessages(key)) continue;
      if (isClientMessageKey(key)) continue;
      const line = content.slice(0, match.index).split("\n").length;
      violations.push(`${file}:${line}: "${key}"`);
    }
  }
}

if (violations.length > 0) {
  console.error(
    "[check-client-messages] client components reference messages stripped from the client payload (see src/i18n/client-messages.ts):",
  );
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}
console.log("[check-client-messages] ok");
