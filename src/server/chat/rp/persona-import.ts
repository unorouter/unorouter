/**
 * Parse a SillyTavern / RisuAI persona JSON file into our persona schema.
 *
 * Reference shapes:
 *  - SillyTavern (single persona export):
 *    `{ name, description, ... }` flat
 *  - SillyTavern persona settings backup:
 *    `{ personas: { "0": { name, description } } }` or
 *    `{ personas: [{ name, description }] }`
 *  - RisuAI persona: similar flat shape, sometimes wrapped under `data`.
 */

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

/**
 * Returns one or more personas. Single-export files yield a 1-element array;
 * multi-persona settings backups yield N entries.
 */
export function parsePersonaJson(raw: unknown): ParsedPersona[] {
  if (!raw || typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;

  // Unwrap optional `data` envelope (RisuAI sometimes nests).
  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;

  // 1. Flat single persona
  const flat = pickPersona(data);
  if (flat) return [flat];

  // 2. `personas` map or array
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
