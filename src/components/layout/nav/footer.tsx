"use client";

import { CompanyName, LogoImage } from "@/components/elements/brand/brand";
import { BreakoutDialog } from "@/components/ui/breakout/breakout-dialog";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";
import { APP_VALUES, msg } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { cn } from "@/lib/utils";
import { dayjs } from "@/lib/utils/format/date";
import { useTranslations } from "next-intl";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useHydrated } from "@/hooks/ui/use-hydrated";
import { FOOTER_BADGES, FOOTER_TEXT_LINKS } from "./footer-badges";
import { isActiveLink } from "./navigation";

const NAV_LINKS = [
  { href: "/models", key: msg("FOOTER.MODELS") },
  { href: "/rankings", key: msg("NAV.RANKINGS") },
  { href: "/compare", key: msg("MODELS.COMPARE.TITLE") },
  { href: "/ai-api-model-tester", key: msg("NAV.MODEL_TESTER") },
  { href: "/pricing", key: msg("FOOTER.PRICING") },
  { href: "/docs/platform", key: msg("FOOTER.DOCUMENTATION") },
  { href: "/blog", key: msg("FOOTER.BLOG") },
] as const;

const EXTERNAL_NAV_LINKS = [
  { href: env.statusUrl, key: msg("FOOTER.STATUS") },
] as const;

const LEGAL_LINKS = [
  { href: "/terms", key: msg("FOOTER.TERMS") },
  { href: "/privacy", key: msg("FOOTER.PRIVACY") },
  { href: "/consents", key: msg("FOOTER.CONSENTS") },
  { href: "/aup", key: msg("FOOTER.AUP") },
  { href: "/refund", key: msg("FOOTER.REFUND") },
  { href: "/impressum", key: msg("FOOTER.IMPRESSUM") },
] as const;

// These directories delist us when their plain text backlink is removed.
// Same scroll speed on every row: the duration scales with the row length.
const BADGE_ROWS = 3;

function FooterLinks(props: {
  links: typeof NAV_LINKS | typeof LEGAL_LINKS;
  pathname: string;
}) {
  const t = useTranslations();
  return (
    <>
      {props.links.map((item) => (
        <li key={item.key}>
          <Link
            href={item.href}
            className={cn(
              "text-foreground/70 hover:text-foreground transition-colors",
              isActiveLink(props.pathname, item.href) &&
                "text-primary font-medium",
            )}
          >
            {t(item.key)}
          </Link>
        </li>
      ))}
    </>
  );
}

export function Footer() {
  const t = useTranslations();
  const pathname = usePathname();
  const [breakoutOpen, setBreakoutOpen] = useState(false);
  // The marquee copy only exists for the seamless loop; leaving it out of the
  // server HTML halves the footer for crawlers and badge checkers.
  const hydrated = useHydrated();

  const visibleBadges = FOOTER_BADGES.filter(
    (badge) =>
      !("liveFrom" in badge) ||
      !dayjs(process.env.NEXT_PUBLIC_BUILD_DATE).isBefore(
        dayjs(badge.liveFrom).subtract(1, "day"),
        "day",
      ),
  );

  const badgeItems: Array<
    (typeof visibleBadges)[number] | (typeof FOOTER_TEXT_LINKS)[number]
  > = [...visibleBadges, ...FOOTER_TEXT_LINKS];
  const perRow = Math.ceil(badgeItems.length / BADGE_ROWS);
  const badgeRows = Array.from({ length: BADGE_ROWS }, (_, i) =>
    badgeItems.slice(i * perRow, (i + 1) * perRow),
  );

  const socialLinks = [
    {
      id: "github",
      href: env.githubUrl,
      icon: "brand-github",
      label: "GitHub",
    },
    {
      id: "discord",
      href: env.discordUrl,
      icon: "brand-discord",
      label: "Discord",
    },
    { id: "x", href: env.twitterUrl, icon: "brand-x-twitter", label: "X" },
    {
      id: "trustpilot",
      href: env.trustpilotUrl,
      icon: "brand-trustpilot",
      label: "Trustpilot",
    },
    {
      id: "reddit",
      href: env.redditUrl,
      icon: "brand-reddit",
      label: "Reddit",
    },
    {
      id: "telegram",
      href: env.telegramUrl,
      icon: "brand-telegram",
      label: "Telegram",
    },
    {
      id: "youtube",
      href: env.youtubeUrl,
      icon: "brand-youtube",
      label: "YouTube",
    },
    {
      id: "instagram",
      href: env.instagramUrl,
      icon: "brand-instagram",
      label: "Instagram",
    },
  ] as const;

  return (
    <footer className="bg-footer relative overflow-hidden rounded-t-3xl border-t md:rounded-t-[4rem]">
      <div className="absolute inset-0 -z-10">
        <div className="bg-primary/30 dark:bg-primary/10 absolute bottom-0 left-0 h-64 w-64 rounded-full blur-3xl"></div>
        <div className="bg-primary/30 dark:bg-primary/10 absolute top-1/4 right-0 h-72 w-72 rounded-full blur-3xl"></div>
      </div>
      <div className="mx-auto max-w-6xl px-5 pt-16 pb-8">
        <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-5">
          <div className="col-span-1 text-center md:col-span-2 md:text-left">
            <div className="mb-4 flex items-center justify-center gap-2 md:justify-start">
              <LogoImage alt="" />
              <CompanyName className="text-2xl" />
            </div>
            <p className="text-foreground/70 mx-auto mb-6 max-w-md md:mx-0">
              {t("FOOTER.DESCRIPTION")}
            </p>
            <div className="flex justify-center space-x-3 md:justify-start">
              {socialLinks.map(
                (social) =>
                  social.href && (
                    <NextLink
                      key={social.id}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-background hover:bg-muted rounded-full p-2 transition-colors"
                      aria-label={social.label}
                    >
                      <Icon name={social.icon} className="h-5 w-5" />
                    </NextLink>
                  ),
              )}
            </div>
          </div>

          <div className="col-span-1 flex justify-center gap-8 md:contents">
            <div className="text-center md:col-span-1 md:text-left">
              <h2 className="mb-4 font-semibold">{t("FOOTER.PRODUCT")}</h2>
              <ul className="space-y-2">
                <FooterLinks links={NAV_LINKS} pathname={pathname} />
                {/* The one guide that ranks for searches outside our brand. */}
                <li>
                  <Link
                    href={{
                      pathname: "/docs/integrations/[slug]",
                      params: { slug: "janitor-ai" },
                    }}
                    className="text-foreground/70 hover:text-foreground transition-colors"
                  >
                    {t("DOCS.JANITOR_AI.BADGE")}
                  </Link>
                </li>
                {EXTERNAL_NAV_LINKS.map((item) => (
                  <li key={item.key}>
                    <NextLink
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground/70 hover:text-foreground inline-flex items-center justify-center gap-2 transition-colors md:justify-start"
                    >
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                      {t(item.key)}
                    </NextLink>
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-center md:col-span-1 md:text-left">
              <h2 className="mb-4 font-semibold">{t("FOOTER.LEGAL")}</h2>
              <ul className="space-y-2">
                <FooterLinks links={LEGAL_LINKS} pathname={pathname} />
              </ul>
            </div>
          </div>

          <div className="col-span-1 text-center md:text-left">
            <h2 className="mb-4 font-semibold">{t("FOOTER.CONTACT_TITLE")}</h2>
            <div className="text-foreground/70 space-y-2 text-sm">
              <p>{t("FOOTER.CONTACT_SUBTITLE")}</p>
              <NextLink
                href={`mailto:${env.supportEmail}`}
                className="text-primary hover:underline"
              >
                {env.supportEmail}
              </NextLink>
            </div>
          </div>
        </div>

        {/* Every badge and text link must stay in the server-rendered DOM: huzzler,
            dododirectory and saasbison auto-delist when their link is missing.
            They are sponsored nofollow because a required badge is a link exchange
            under Google's link spam policy. */}
        <div className="border-muted/50 space-y-4 border-t pt-8 pb-4">
          {badgeRows.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="marquee-row relative overflow-hidden opacity-70"
            >
              <div
                className={cn(
                  "flex w-max items-center gap-4",
                  rowIndex % 2 === 0
                    ? "animate-marquee-slow"
                    : "animate-marquee-slow-reverse",
                )}
                style={{ animationDuration: `${row.length * 3}s` }}
              >
                {(hydrated ? [false, true] : [false]).map((isDup) => (
                  <div
                    key={String(isDup)}
                    className={cn(
                      "flex shrink-0 items-center gap-4",
                      isDup && "marquee-dup",
                    )}
                    aria-hidden={isDup || undefined}
                    inert={isDup}
                  >
                    {row.map((item) =>
                      "src" in item ? (
                        <NextLink
                          key={item.href}
                          {...("data" in item ? item.data : undefined)}
                          href={item.href}
                          target="_blank"
                          rel="sponsored nofollow noopener noreferrer"
                          className="shrink-0"
                          tabIndex={isDup ? -1 : undefined}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.src}
                            alt={
                              "alt" in item && item.alt
                                ? item.alt
                                : t(
                                    "verified" in item && item.verified
                                      ? "FOOTER.BADGE_VERIFIED_ON"
                                      : "FOOTER.BADGE_FEATURED_ON",
                                    { name: item.name },
                                  )
                            }
                            width={item.width}
                            height={24}
                            loading="lazy"
                            decoding="async"
                            className={cn(
                              "h-6 w-auto max-w-none",
                              "lightBg" in item &&
                                item.lightBg &&
                                "rounded-sm bg-white/90 px-1 py-0.5",
                            )}
                          />
                        </NextLink>
                      ) : (
                        <NextLink
                          key={item.href}
                          href={item.href}
                          target="_blank"
                          rel="sponsored nofollow noopener noreferrer"
                          tabIndex={isDup ? -1 : undefined}
                          className="text-foreground/50 hover:text-foreground/70 shrink-0 text-xs whitespace-nowrap transition-colors"
                        >
                          {item.label}
                        </NextLink>
                      ),
                    )}
                  </div>
                ))}
              </div>
              <div className="from-background pointer-events-none absolute inset-y-0 left-0 w-24 bg-linear-to-r to-transparent" />
              <div className="from-background pointer-events-none absolute inset-y-0 right-0 w-24 bg-linear-to-l to-transparent" />
            </div>
          ))}
        </div>

        <div className="border-muted/50 relative border-t pt-8">
          <div className="via-primary/70 absolute top-0 left-1/2 h-px w-1/2 -translate-x-1/2 bg-linear-to-r from-transparent to-transparent"></div>
          <div className="text-foreground/70 relative flex items-center justify-center text-sm">
            <p className="text-center" suppressHydrationWarning>
              {t("FOOTER.COPYRIGHT", {
                year:
                  (process.env.NEXT_PUBLIC_BUILD_DATE ?? "").slice(0, 4) ||
                  String(dayjs().year()),
                ...APP_VALUES,
              })}
            </p>
            <button
              type="button"
              onClick={() => setBreakoutOpen(true)}
              aria-label={t("FOOTER.EASTER_EGG_LABEL")}
              className="text-foreground/60 hover:text-primary absolute right-0 font-mono text-xs leading-none transition-colors"
            >
              ▞
            </button>
          </div>
        </div>
      </div>
      <BreakoutDialog open={breakoutOpen} onOpenChange={setBreakoutOpen} />
    </footer>
  );
}
