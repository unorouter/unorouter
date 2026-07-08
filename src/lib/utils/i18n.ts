type TValues = Record<string, string | number | Date | undefined>;

type LooseTranslator = (key: string, values?: TValues) => string;

export function safeT(
  t: LooseTranslator,
  key: string,
  fallback: string,
  values?: TValues,
): string {
  try {
    const out = t(key, values);
    return out === key ? fallback : out;
  } catch {
    return fallback;
  }
}
