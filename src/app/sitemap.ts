import { getCatalog } from "@/server/models/pricing/pricing.service";
import { COMPARE_PAIRS } from "@/components/pages/navbar/models/compare/compare-pairs";
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
import { modelSlug, vendorSlug } from "@/lib/utils/base";
import { dayjs } from "@/lib/utils/format/date";
import type { MetadataRoute } from "next";

type EntryOptions = {
  priority?: number;
  changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"];
  lastModified?: Date | SeoTimestampSlug;
};

const privateSet = new Set<string>([
  ...privateRoutes.static,
  ...privateRoutes.dynamicParents,
]);
const docPathSet = new Set<string>(
  DOCS_REGISTRY.flatMap((d) => (typeof d.path === "string" ? [d.path] : [])),
);

function localizedEntries(
  href: Pathname,
  options: EntryOptions,
): MetadataRoute.Sitemap {
  const lastModified =
    typeof options.lastModified === "string"
      ? (getSeoTimestamps(options.lastModified)?.modified ?? null)
      : options.lastModified;
  const resolved = dayjs(
    lastModified ?? process.env.NEXT_PUBLIC_BUILD_DATE,
  ).toDate();

  // No per-URL hreflang alternates: every page declares the full set in its
  // head already, and duplicating them for 18 locales pushed this file past
  // Google's 50MB hard limit (53MB, ~416k xhtml:link entries), after which
  // Google stopped reading it fully.
  return routing.locales.map((locale) => ({
    url: `${env.siteOrigin}${getPathname({ locale, href })}`,
    lastModified: resolved,
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
  const topLevelRoutes = (
    Object.keys(pathnames) as (keyof typeof pathnames)[]
  ).filter(
    (route): route is StaticRoute =>
      !route.includes("[") &&
      !privateSet.has(route) &&
      !docPathSet.has(route) &&
      route !== "/docs" &&
      !route.startsWith("/docs/integrations/"),
  );

  const pricing = await getCatalog().catch(() => null);
  if (!pricing?.models?.length)
    console.error(
      "[sitemap] pricing returned no models; model pages omitted from sitemap",
    );

  const modelNames = [
    ...new Set((pricing?.models ?? []).map((m) => m.model_name)),
  ];
  const nameSet = new Set(modelNames);

  const nameToVendor = new Map<string, string>(
    (pricing?.models ?? []).map((m) => [m.model_name, m.vendor] as const),
  );
  const nameToReleaseDate = new Map<string, Date>();
  for (const model of pricing?.models ?? []) {
    const ms = model.release_ts;
    if (ms) nameToReleaseDate.set(model.model_name, new Date(ms));
  }
  const sitemapModelNames = modelNames.filter((name) =>
    vendorSlug(nameToVendor.get(name) ?? ""),
  );
  // Vendor pages resolve against online-only pricing; offline-only vendors 404.
  const sitemapVendorSlugs = [
    ...new Set(
      (pricing?.models ?? [])
        .filter((m) => m.online)
        .map((m) => vendorSlug(m.vendor))
        .filter(Boolean),
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
          // Falling back to the build date stamps every model page "changed
          // today" on every deploy. Google then treats lastModified as
          // unreliable and ignores it, which stalled recrawl of ~5.6k model URLs.
          lastModified: nameToReleaseDate.get(name),
        },
      );
    }),
    ...sitemapVendorSlugs.flatMap((slug) =>
      localizedEntries(
        { pathname: "/models/[...slug]", params: { slug: [slug] } },
        { priority: 0.5, changeFrequency: "weekly" },
      ),
    ),
    ...COMPARE_PAIRS.filter(([a, b]) =>
      [a, b].every((name) => nameSet.has(name)),
    ).flatMap(([a, b]) =>
      localizedEntries(
        {
          pathname: "/compare/[...slugs]",
          params: { slugs: [modelSlug(a), modelSlug(b)] },
        },
        { priority: 0.5, changeFrequency: "weekly" },
      ),
    ),
  ];
}
