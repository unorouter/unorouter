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
  pathnames,
  privateRoutes,
  routing,
} from "@/i18n/routing";
import { env } from "@/lib/config/env";
import { rpc } from "@/lib/rpc";
import { getSeoTimestamps } from "@/lib/seo/metadata";
import { baseModelName, handleElysia, modelSlug } from "@/lib/utils/base";
import { dayjs } from "@/lib/utils/format/date";
import { listCatalogNames } from "@/server/models/pricing/model-catalog.service";
import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

type EntryOptions = {
  priority?: number;
  changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"];
  lastModified?: Date | SeoTimestampSlug;
};

const privateSet = new Set<string>([
  ...privateRoutes.static,
  ...privateRoutes.dynamicParents,
]);
// Only /docs index has a static-string path; guide entries carry a dynamic /docs/[slug] href object.
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
  const resolved = (lastModified ? dayjs(lastModified) : dayjs()).toDate();

  const languages: Record<string, string> = Object.fromEntries(
    routing.locales.map((cur) => [
      cur,
      `${env.siteOrigin}${getPathname({ locale: cur, href })}`,
    ]),
  );
  languages["x-default"] =
    `${env.siteOrigin}${getPathname({ locale: routing.defaultLocale, href })}`;

  return routing.locales.map((locale) => ({
    url: `${env.siteOrigin}${getPathname({ locale, href })}`,
    lastModified: resolved,
    ...(options.priority !== undefined && { priority: options.priority }),
    ...(options.changeFrequency && {
      changeFrequency: options.changeFrequency,
    }),
    alternates: { languages },
  }));
}

function sectionOptions(route: string): EntryOptions {
  return route in SECTION_PRIORITIES
    ? SECTION_PRIORITIES[route as keyof typeof SECTION_PRIORITIES]
    : DEFAULT_PRIORITY;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const topLevelRoutes = (
    Object.keys(pathnames) as (keyof typeof pathnames)[]
  ).filter(
    (route) =>
      !route.includes("[") &&
      !privateSet.has(route) &&
      !docPathSet.has(route) &&
      // /docs 301s to /docs/platform; the tab indexes come from DOCS_REGISTRY.
      route !== "/docs" &&
      !route.startsWith("/docs/integrations/"),
  );

  // A silent empty drops every model page from the sitemap; retry once before giving up.
  const pricing = await rpc.api.models.pricing
    .get()
    .then(handleElysia)
    .catch(() =>
      rpc.api.models.pricing
        .get()
        .then(handleElysia)
        .catch(() => null),
    );
  if (!pricing?.models?.length)
    console.error(
      "[sitemap] pricing returned no models; model pages omitted from sitemap",
    );

  // Model URLs come from the durable catalog (models seen within the retire
  // window), NOT the live response: free models churn in/out of pricing hourly
  // and a live-derived URL set turns into GSC 404s at crawl time. Fresh-DB
  // fallback: the live models (catalog empty until the first snapshot).
  // :free twins whose base model exists are skipped; those pages canonical to
  // the base, so emitting both would double duplicate-content URLs.
  const catalogNames = await listCatalogNames().catch(() => []);
  const modelNames = catalogNames.length
    ? catalogNames
    : (pricing?.models ?? []).map((m) => m.name);
  const nameSet = new Set(modelNames);
  const sitemapModelNames = modelNames.filter(
    (name) => !(name.endsWith(":free") && nameSet.has(baseModelName(name))),
  );

  return [
    ...topLevelRoutes.flatMap((route) =>
      localizedEntries(route as Pathname, sectionOptions(route)),
    ),
    ...DOCS_REGISTRY.flatMap((doc) =>
      localizedEntries(doc.path as Pathname, {
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
    ...sitemapModelNames.flatMap((name) =>
      localizedEntries(
        { pathname: "/models/[slug]", params: { slug: modelSlug(name) } },
        { priority: 0.6, changeFrequency: "weekly" },
      ),
    ),
    // Curated head-to-head pairs only; drop any pair whose models left the
    // catalog (retired), judged against the stable set, not hourly liveness.
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
