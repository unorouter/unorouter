import { routing } from "@/i18n/routing";
import { modelSlug, vendorSlug } from "@/lib/utils/base";
import { getModelByName } from "@/server/models/pricing/pricing.service";
import { getOfflinePricingSnapshot } from "@/server/models/pricing/pricing-snapshot";

// Localized first segments ("modelle" -> de), derived from routing.pathnames
// so a new locale needs no edit here.
function segmentMap(route: "/models/[...slug]" | "/compare/[...slugs]") {
  const map = new Map(
    Object.entries(routing.pathnames[route]).map(([locale, path]) => [
      path.split("/")[1]!,
      locale,
    ]),
  );
  map.set(route.split("/")[1]!, routing.defaultLocale);
  return map;
}

const MODEL_SEGMENTS = segmentMap("/models/[...slug]");
const COMPARE_SEGMENTS = segmentMap("/compare/[...slugs]");

// Model URLs have to be classified before anything renders. Per the Next docs
// on notFound(): under Cache Components every dynamic route streams a static
// shell first, so the segment's own notFound() lands after the 200 is already
// committed and Google files the not-found body as a soft 404 on a live URL.
// Checking here is the documented way to still set a status.
export async function resolveSeoPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean).map(decode);
  const [locale, segment, ...slug] = parts;
  if (!locale || !segment || slug.length === 0) return null;

  const isModel = MODEL_SEGMENTS.get(segment) === locale;
  if (!isModel && COMPARE_SEGMENTS.get(segment) !== locale) return null;

  // include_offline, matching the page's own resolveModel and the sitemap: a
  // model with every channel down still has a real page, and the online-only
  // feed would 404 the URLs the sitemap advertises. Plain module state, NOT a
  // "use cache" function: the proxy cannot call one, and the failure is silent
  // (every lookup resolves to "pass" and the whole check stops running).
  const pricing = await getOfflinePricingSnapshot().catch(() => null);
  // A dead pricing feed must never turn live model pages into 404s.
  if (!pricing?.models.length) return null;

  const models = pricing.models;
  const known = (s: string) =>
    models.some((m) => m.name === s || modelSlug(m.name) === s);

  // A comparison of a model that no longer exists renders a partial page at
  // 200 whose canonical drops the missing slug, pointing Google at a different
  // URL than the one it crawled. Every slug has to resolve or the URL is gone.
  if (!isModel) {
    return slug.every(known) ? null : ({ gone: true, to: null } as const);
  }

  const candidate = slug.length === 1 ? slug[0]! : slug[1]!;

  const live =
    slug.length === 1
      ? models.some(
          (m) => vendorSlug(m.vendor.name) === candidate.toLowerCase(),
        )
      : known(candidate);
  if (live) return null;

  // Still a real model under an older URL shape: ":free" dropped, or a
  // "vendor/model" name addressed by its bare model part.
  const match = models.find(
    (m) =>
      m.name === `${candidate}:free` ||
      m.name.split("/")[1]?.replace(":free", "") === candidate,
  );
  // Last check before killing a URL. The snapshot is up to 5min stale and the
  // catalog churns as channels flap, so confirm against the by-name lookup the
  // page itself falls back to (it answers for fully-dark models absent from
  // every feed). It returns null for an upstream failure as well as a genuine
  // miss, so this can still 404 a live URL during an outage - the short
  // s-maxage on the response is what bounds that.
  if (!match) {
    const byName = await getModelByName(candidate).catch(() => null);
    return byName ? null : ({ gone: true, to: null } as const);
  }

  const vendor = vendorSlug(match.vendor.name) || "unknown";
  // modelSlug already encodes what needs encoding ([ ] /). Re-encoding would
  // turn ":free" into "%3Afree" and point the 301 at a different string than
  // the sitemap and canonical tag emit.
  return {
    gone: false,
    to: `/${locale}/${segment}/${vendor}/${modelSlug(match.name)}`,
  } as const;
}

function decode(part: string) {
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
}
