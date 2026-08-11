import { routing } from "@/i18n/routing";
import { findModelForLegacySlug, modelSlug, vendorSlug } from "@/lib/utils/base";
import { getPricingSnapshot } from "@/server/models/pricing/pricing-snapshot";

// The localized first segment of /models/[...slug] per locale, mapped back to
// the locale that owns it ("modelle" -> de). Derived from routing.pathnames so
// adding a locale needs no edit here.
const MODEL_SEGMENTS = new Map<string, string>(
  Object.entries(routing.pathnames["/models/[...slug]"]).flatMap(
    ([locale, path]) => {
      const seg = path.split("/")[1];
      return seg ? [[seg, locale] as const] : [];
    },
  ),
);
MODEL_SEGMENTS.set("models", routing.defaultLocale);

type ParsedModelPath = { locale: string; segment: string; slug: string[] };

function decodeSegment(part: string): string {
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
}

// Matches /<locale>/<localized-models-segment>/<rest...>; null for anything
// else so the caller falls through untouched.
export function parseModelPath(pathname: string): ParsedModelPath | null {
  const parts = pathname.split("/").filter(Boolean).map(decodeSegment);
  if (parts.length < 3) return null;
  const [locale, segment, ...slug] = parts;
  if (!locale || !segment || slug.length === 0) return null;
  if (!(routing.locales as readonly string[]).includes(locale)) return null;
  if (MODEL_SEGMENTS.get(segment) !== locale) return null;
  return { locale, segment, slug };
}

// Canonical path for a stale model URL, or null when the slug is already
// canonical or names nothing. Reads the shared 5min pricing snapshot, so a hit
// costs a map lookup rather than an upstream call.
export async function canonicalModelPath(
  parsed: ParsedModelPath,
): Promise<string | null> {
  const candidate =
    parsed.slug.length === 1 ? parsed.slug[0]! : (parsed.slug[1] ?? "");
  if (!candidate) return null;

  const snapshot = await getPricingSnapshot().catch(() => null);
  if (!snapshot?.models.length) return null;

  // A canonical two-segment URL resolves by exact name; skip the legacy scan so
  // the common case stays a single map hit.
  if (parsed.slug.length === 2 && snapshot.byName.has(candidate)) return null;

  const match = findModelForLegacySlug(snapshot.models, candidate);
  if (!match) return null;

  const vendor = vendorSlug(match.vendor.name) || "unknown";
  const model = modelSlug(match.name);
  if (parsed.slug.length === 2 && parsed.slug[0] === vendor) return null;

  // modelSlug already percent-encodes the only characters that need it ([ ] /).
  // Re-encoding here would turn the ":free" suffix into "%3Afree" and point the
  // 301 at a different string than the sitemap and canonical tag emit.
  return `/${parsed.locale}/${parsed.segment}/${vendor}/${model}`;
}
