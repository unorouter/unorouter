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
import { handleElysia, modelSlug } from "@/lib/utils/base";
import { dayjs } from "@/lib/utils/format/date";
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
// Only the "/docs" index has a static-string path; guide entries carry a
// dynamic "/docs/[slug]" href object, which never collides with a pathnames key.
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
      !route.includes("[") && !privateSet.has(route) && !docPathSet.has(route),
  );

  // A silent empty here drops every model page from the sitemap (Google then can
  // only discover them by crawl, finding stale links). Retry once before giving up.
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
    ...(pricing?.models ?? []).flatMap((model) =>
      localizedEntries(
        { pathname: "/models/[slug]", params: { slug: modelSlug(model.name) } },
        { priority: 0.6, changeFrequency: "weekly" },
      ),
    ),
  ];
}
