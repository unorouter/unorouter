type TValues = Record<string, string | number | Date | undefined>;

// Loose translator shape. NOT `ReturnType<typeof useTranslations>`: that strict overloaded
// type makes the `t(key as never)` call instantiate excessively deep (TS2589) - the same
// reason mcp-server-card.ts hand-rolls its translator type. next-intl's `t` is a plain
// string->string callable at runtime, so this minimal signature is sound + cheap.
type LooseTranslator = (key: string, values?: TValues) => string;

// Probe an OPTIONAL/DYNAMIC translation key. The dev IntlProvider THROWS on a missing
// key (to surface accidentally-pruned STATIC keys), but some keys are legitimately
// runtime-derived (FORM.TYPE.<field>) or "maybe a key, maybe a raw string" (an upstream
// error message). For those, swallow the throw and return the fallback instead of
// crashing the boundary. Also treats next-intl's "returns the key verbatim" miss
// (prod onError path) as a miss.
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
