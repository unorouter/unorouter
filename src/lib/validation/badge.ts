import { Type as t } from "@sinclair/typebox/type";
import { LOCALES } from "../config/constants";

export const BADGE_SIZES = ["xs", "sm", "md", "lg", "xl", "og"] as const;
export type BadgeSize = (typeof BADGE_SIZES)[number];

export const BADGE_TYPES = [
  "banner",
  "square",
  "sponsor",
  "providers",
  "pricing",
  "hero",
  "referral",
  "brand",
] as const;
export type BadgeType = (typeof BADGE_TYPES)[number];

export const THEMES = ["dark", "light"] as const;
export type Theme = (typeof THEMES)[number];
export const FORMATS = ["svg", "png"] as const;
export type BadgeFormat = (typeof FORMATS)[number];

export const badgeQuery = t.Object({
  locale: t.Optional(
    t.Union(
      LOCALES.map((v) => t.Literal(v)),
      { default: LOCALES[0] },
    ),
  ),
  theme: t.Optional(
    t.Union(
      THEMES.map((v) => t.Literal(v)),
      { default: THEMES[0] },
    ),
  ),
  ref: t.Optional(t.String()),
  format: t.Optional(t.Union(FORMATS.map((v) => t.Literal(v)))),
  size: t.Optional(
    t.Union(
      BADGE_SIZES.map((v) => t.Literal(v)),
      { default: BADGE_SIZES[2] },
    ),
  ),
  type: t.Optional(t.Union(BADGE_TYPES.map((v) => t.Literal(v)))),
});

export interface BuildBadgeUrlOptions {
  locale?: string;
  theme?: Theme;
  size?: BadgeSize;
  format?: BadgeFormat;
  ref?: string;
  origin?: string;
}

export function buildBadgeUrl(
  type: BadgeType,
  opts: BuildBadgeUrlOptions = {},
): string {
  const params = new URLSearchParams();
  if (opts.locale) params.set("locale", opts.locale);
  if (opts.theme) params.set("theme", opts.theme);
  if (opts.size) params.set("size", opts.size);
  if (opts.format && opts.format !== "svg") params.set("format", opts.format);
  if (opts.ref) params.set("ref", opts.ref);
  const qs = params.toString();
  const path = `/api/badge/${type}${qs ? `?${qs}` : ""}`;
  return opts.origin ? `${opts.origin}${path}` : path;
}
