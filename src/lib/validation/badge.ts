import { Type as t } from "@sinclair/typebox/type";

export const BADGE_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;
export type BadgeSize = (typeof BADGE_SIZES)[number];

/** Map query param value to canonical BadgeSize */
export function parseBadgeSize(raw: string | undefined): BadgeSize {
  if (!raw) return "md";
  if (BADGE_SIZES.includes(raw as BadgeSize)) return raw as BadgeSize;
  return "md";
}

export const badgeQuery = t.Object({
  locale: t.Optional(t.Union([t.Literal("en"), t.Literal("de")])),
  theme: t.Optional(t.Union([t.Literal("dark"), t.Literal("light"), t.Literal("auto")])),
  ref: t.Optional(t.String()),
  format: t.Optional(t.Union([t.Literal("svg"), t.Literal("png")])),
  size: t.Optional(t.Union([
    t.Literal("xs"), t.Literal("sm"), t.Literal("md"), t.Literal("lg"), t.Literal("xl"),
  ])),
});
