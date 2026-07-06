type ParsedPersona = {
  name: string;
  description?: string;
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
  };
}

export function parsePersonaJson(raw: unknown): ParsedPersona[] {
  if (!raw || typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;
  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;

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
