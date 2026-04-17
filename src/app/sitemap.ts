import { getPathname } from "@/i18n/navigation";
import {
  BLOG_REGISTRY,
  DEFAULT_PRIORITY,
  DOCS_REGISTRY,
  SECTION_PRIORITIES,
} from "@/i18n/registry";
import {
  type Pathname,
  pathnames,
  privateRoutes,
  routing,
} from "@/i18n/routing";
import { env } from "@/lib/config/env";
import { rpc } from "@/lib/rpc";
import { getSeoTimestamps } from "@/lib/seo/timestamps";
import { handleElysia } from "@/lib/utils/base";
import type { MetadataRoute } from "next";

type EntryOptions = {
  priority?: number;
  changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"];
  /** Either an explicit Date, a timestamp slug to look up, or nothing (uses now). */
  lastModified?: Date | string;
};

const ORIGIN = new URL(env.appUrl).origin;
const privateSet = new Set<string>([
  ...privateRoutes.static,
  ...privateRoutes.dynamicParents,
]);
const docPathSet = new Set<string>(DOCS_REGISTRY.map((d) => d.path));

function localizedEntries(
  href: Pathname,
  options: EntryOptions,
): MetadataRoute.Sitemap {
  const lastModified =
    typeof options.lastModified === "string"
      ? (getSeoTimestamps(options.lastModified)?.modified ?? null)
      : options.lastModified;
  const resolved = lastModified ? new Date(lastModified) : new Date();

  const languages = Object.fromEntries(
    routing.locales.map((cur) => [
      cur,
      `${ORIGIN}${getPathname({ locale: cur, href })}`,
    ]),
  );

  return routing.locales.map((locale) => ({
    url: `${ORIGIN}${getPathname({ locale, href })}`,
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

  const pricing = await rpc.api.pricing
    .get()
    .then(handleElysia)
    .catch(() => null);

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
        { pathname: "/models/[slug]", params: { slug: model.name } },
        { priority: 0.6, changeFrequency: "weekly" },
      ),
    ),
  ];
}
