import { rec } from "@/lib/utils/base";
type ParsedPersona = {
  name: string;
  description?: string;
  personality?: string;
};

function firstString(
  raw: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const v = raw[key];
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
}

function pickPersona(raw: Record<string, unknown>): ParsedPersona | null {
  const name = firstString(raw, ["name", "persona_name"]);
  if (!name) return null;
  return {
    name,
    description: firstString(raw, ["description", "persona", "user_persona"]),
    personality: firstString(raw, ["personality", "traits"]),
  };
}

export function parsePersonaJson(raw: unknown): ParsedPersona[] {
  const root = rec(raw);
  if (!root) return [];
  const data = rec(root.data) ?? root;

  const flat = pickPersona(data);
  if (flat) return [flat];

  const personas = data.personas;
  const entries =
    Array.isArray(personas) || (personas && typeof personas === "object")
      ? Object.values(personas)
      : [];
  return entries
    .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
    .map(pickPersona)
    .filter((p): p is ParsedPersona => p !== null);
}
