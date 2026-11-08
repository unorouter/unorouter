import { COMPARE_PAIRS } from "@/components/pages/navbar/models/compare/compare-pairs";
import { MODEL_PAGE_LOCALES } from "@/lib/seo/metadata";
import { getPathname } from "@/i18n/navigation";
import {
  BLOG_REGISTRY,
  DEFAULT_PRIORITY,
  DOCS_REGISTRY,
  SECTION_PRIORITIES,
  type SeoTimestampSlug,
} from "@/i18n/registry";
import {
  type Pathname,
  type StaticRoute,
  pathnames,
  privateRoutes,
  routing,
} from "@/i18n/routing";
import { env } from "@/lib/config/env";
import { getSeoTimestamps } from "@/lib/seo/metadata";
import { hasRealVendor, modelSlug, vendorSlug } from "@/lib/utils/base";
import { dayjs } from "@/lib/utils/format/date";
import { getCatalog } from "@/server/models/pricing/pricing.service";
import type { MetadataRoute } from "next";

type EntryOptions = {
  priority?: number;
  changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"];
  lastModified?: Date | SeoTimestampSlug;
  locales?: readonly (typeof routing.locales)[number][];
};

const privateSet = new Set<string>([
  ...privateRoutes.static,
  ...privateRoutes.noindex,
  // Browser-local data only, so a crawler gets an empty shell; noindex in metadata.
  ...privateRoutes.publicChildren,
  ...privateRoutes.dynamicParents,
]);

// next.config.ts redirects this permanently, so it is not a canonical URL.
const REDIRECTED_ROUTES = new Set<string>(["/docs"]);
// noindex pages stay crawlable (no robots.txt block) so Google can read the noindex.
const NOINDEX_ROUTES = new Set<string>(["/impressum", "/consents"]);

const docUrlSet = new Set<string>(
  DOCS_REGISTRY.map((doc) =>
    getPathname({ locale: routing.defaultLocale, href: doc.path }),
  ),
);

function localizedEntries(
  href: Pathname,
  options: EntryOptions,
): MetadataRoute.Sitemap {
  const lastModified =
    typeof options.lastModified === "string"
      ? (getSeoTimestamps(options.lastModified)?.modified ?? null)
      : options.lastModified;
  // No lastmod beats a fake one: the build date told Google every page changed
  // on each deploy.
  const resolved = lastModified ? dayjs(lastModified).toDate() : undefined;

  // No per-URL hreflang alternates: 18 locales pushed this past Google's 50MB
  // limit (53MB, ~416k xhtml:link entries) and it stopped being read.
  return (options.locales ?? routing.locales).map((locale) => ({
    url: `${env.siteOrigin}${getPathname({ locale, href })}`,
    ...(resolved && { lastModified: resolved }),
    ...(options.priority !== undefined && { priority: options.priority }),
    ...(options.changeFrequency && {
      changeFrequency: options.changeFrequency,
    }),
  }));
}

function sectionOptions(route: StaticRoute): EntryOptions {
  return route in SECTION_PRIORITIES
    ? SECTION_PRIORITIES[route as keyof typeof SECTION_PRIORITIES]
    : DEFAULT_PRIORITY;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = (
    Object.keys(pathnames) as (keyof typeof pathnames)[]
  ).filter((route): route is StaticRoute => !route.includes("["));
  const topLevelRoutes = staticRoutes.filter(
    (route) =>
      !privateSet.has(route) &&
      !REDIRECTED_ROUTES.has(route) &&
      !NOINDEX_ROUTES.has(route) &&
      !docUrlSet.has(
        getPathname({ locale: routing.defaultLocale, href: route }),
      ),
  );

  // Fail rather than publish a sitemap missing ~5k model URLs: Google retries an
  // error, but reads a shrunken sitemap as those pages being gone.
  const pricing = await getCatalog(false, true);
  if (!pricing.models?.length)
    throw new Error("[sitemap] pricing returned no models");

  const modelNames = [...new Set(pricing.models.map((m) => m.model_name))];
  const nameSet = new Set(modelNames);

  const nameToVendor = new Map<string, string>(
    pricing.models.map((m) => [m.model_name, m.vendor] as const),
  );
  const nameToReleaseDate = new Map<string, Date>();
  for (const model of pricing.models) {
    const ms = model.release_ts;
    if (ms) nameToReleaseDate.set(model.model_name, new Date(ms));
  }
  // A :free page with a paid sibling canonicalizes to it, so it is not listed.
  const sitemapModelNames = modelNames.filter(
    (name) =>
      hasRealVendor(nameToVendor.get(name) ?? "") &&
      !(name.endsWith(":free") && nameSet.has(name.slice(0, -":free".length))),
  );
  const vendorLatest = new Map<string, Date>();
  for (const [name, date] of nameToReleaseDate) {
    const slug = vendorSlug(nameToVendor.get(name) ?? "");
    const prev = vendorLatest.get(slug);
    if (slug && (!prev || date > prev)) vendorLatest.set(slug, date);
  }
  const sitemapVendorSlugs = [
    ...new Set(
      pricing.models
        .filter((m) => hasRealVendor(m.vendor))
        .map((m) => vendorSlug(m.vendor)),
    ),
  ];

  return [
    ...topLevelRoutes.flatMap((route) =>
      localizedEntries(route, sectionOptions(route)),
    ),
    ...DOCS_REGISTRY.flatMap((doc) =>
      localizedEntries(doc.path, {
        priority: doc.priority,
        changeFrequency: doc.changeFrequency,
        lastModified: doc.slug,
      }),
    ),
    ...BLOG_REGISTRY.flatMap((post) =>
      localizedEntries(
        { pathname: "/blog/[slug]", params: { slug: post.slug } },
        {
          priority: post.priority,
          changeFrequency: post.changeFrequency,
          lastModified: `blog/${post.slug}`,
        },
      ),
    ),
    ...sitemapModelNames.flatMap((name) => {
      const slug = [vendorSlug(nameToVendor.get(name) ?? ""), modelSlug(name)];
      return localizedEntries(
        { pathname: "/models/[...slug]", params: { slug } },
        {
          priority: 0.6,
          changeFrequency: "weekly",
          // No build-date fallback: "changed today" every deploy stalled recrawl
          // of ~5.6k model URLs.
          lastModified: nameToReleaseDate.get(name),
          locales: MODEL_PAGE_LOCALES,
        },
      );
    }),
    ...sitemapVendorSlugs.flatMap((slug) =>
      localizedEntries(
        { pathname: "/models/[...slug]", params: { slug: [slug] } },
        {
          priority: 0.5,
          changeFrequency: "weekly",
          lastModified: vendorLatest.get(slug),
          locales: MODEL_PAGE_LOCALES,
        },
      ),
    ),
    ...COMPARE_PAIRS.filter(([a, b]) =>
      [a, b].every((name) => nameSet.has(name)),
    ).flatMap(([a, b]) =>
      localizedEntries(
        {
          pathname: "/compare/[...slugs]",
          // The compare page's canonical sorts the slugs; listing the other order
          // here made Search Console report every pair as an alternate page.
          params: { slugs: [modelSlug(a), modelSlug(b)].sort() },
        },
        {
          priority: 0.5,
          changeFrequency: "weekly",
          locales: MODEL_PAGE_LOCALES,
          lastModified: [a, b]
            .map((name) => nameToReleaseDate.get(name))
            .reduce<Date | undefined>(
              (acc, d) => (d && (!acc || d > acc) ? d : acc),
              undefined,
            ),
        },
      ),
    ),
  ];
}
