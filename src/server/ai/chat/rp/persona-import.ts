// Parses SillyTavern/RisuAI persona JSON shapes:
//   ST single export: { name, description, ... } flat
//   ST settings backup: { personas: { "0": {...} } } or array
//   RisuAI: flat or wrapped under `data`.

export type ParsedPersona = {
  name: string;
  description?: string;
};

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

function pickPersona(raw: Record<string, unknown>): ParsedPersona | null {
  const name = asString(raw.name) ?? asString(raw.persona_name);
  if (!name) return null;
  return {
    name,
    description:
      asString(raw.description) ??
      asString(raw.persona) ??
      asString(raw.user_persona),
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
  const out: ParsedPersona[] = [];
  if (Array.isArray(personas)) {
    for (const p of personas) {
      if (p && typeof p === "object") {
        const parsed = pickPersona(p as Record<string, unknown>);
        if (parsed) out.push(parsed);
      }
    }
  } else if (personas && typeof personas === "object") {
    for (const v of Object.values(personas)) {
      if (v && typeof v === "object") {
        const parsed = pickPersona(v as Record<string, unknown>);
        if (parsed) out.push(parsed);
      }
    }
  }

  return out;
}
