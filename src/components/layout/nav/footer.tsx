"use client";

import { CompanyName, LogoImage } from "@/components/elements/brand/brand";
import { BreakoutDialog } from "@/components/ui/breakout/breakout-dialog";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";
import { analytics } from "@/lib/analytics";
import { APP_VALUES, msg } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { cn } from "@/lib/utils";
import { dayjs } from "@/lib/utils/format/date";
import { useTranslations } from "next-intl";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { isActiveLink } from "./navigation";

const NAV_LINKS = [
  { href: "/models", key: msg("FOOTER.MODELS") },
  { href: "/pricing", key: msg("FOOTER.PRICING") },
  { href: "/docs", key: msg("FOOTER.DOCUMENTATION") },
  { href: "/blog", key: msg("FOOTER.BLOG") },
] as const;

const EXTERNAL_NAV_LINKS = [
  { href: env.statusUrl, key: msg("FOOTER.STATUS") },
] as const;

const LEGAL_LINKS = [
  { href: "/terms", key: msg("FOOTER.TERMS") },
  { href: "/privacy", key: msg("FOOTER.PRIVACY") },
  { href: "/aup", key: msg("FOOTER.AUP") },
  { href: "/refund", key: msg("FOOTER.REFUND") },
] as const;

const FEATURED_BADGES = [
  {
    href: "https://startupfa.me/s/unorouter?utm_source=unorouter.com",
    src: "/badges/startupfame.webp",
    name: "Startup Fame",
    verified: false,
    width: 76,
  },
  {
    href: "https://dang.ai/tool/unorouter-openai-compatible-llm-gateway",
    src: "/badges/dang.png",
    name: "DANG!",
    verified: true,
    width: 67,
  },
  {
    href: "https://twelve.tools/unorouter-ai",
    src: "/badges/twelvetools.svg",
    name: "Twelve Tools",
    verified: false,
    width: 89,
  },
  {
    href: "https://fazier.com/launches/unorouter",
    src: "/badges/fazier.svg",
    name: "Fazier",
    verified: false,
    width: 102,
  },
  {
    href: "https://www.producthunt.com/products/unorouter",
    src: "/badges/producthunt.svg",
    name: "Product Hunt",
    verified: false,
    width: 111,
  },
] as const;

// Reciprocal verification links: each directory crawls unorouter.com for ITS own
// dofollow link (the href) before approving our listing. The badge IMAGES are
// served locally (mirrored into public/badges) because the page is cross-origin
// isolated (COEP require-corp) and remote SVGs without CORP headers are blocked.
// AI Toolz Dir offers no image badge, so it renders as a text link.
const RECIPROCAL_LINKS = [
  {
    href: "https://thesaasdir.com/product/unorouter?ref=badge",
    src: "/badges/thesaasdir.svg",
    name: "TheSaaSDir",
    width: 182,
    height: 46,
  },
  {
    href: "https://www.aitoolzdir.com",
    src: "/badges/aitoolzdir.svg",
    name: "AI Toolz Dir",
    width: 168,
    height: 46,
  },
  {
    href: "https://turbo0.com/item/unorouter",
    src: "/badges/turbo0.svg",
    name: "Turbo0",
    width: 72,
    height: 46,
  },
  {
    href: "https://codetrendy.com/?utm_source=unorouter.com&utm_medium=badge",
    src: "/badges/codetrendy.svg",
    name: "CodeTrendy",
    width: 181,
    height: 46,
  },
  {
    href: "https://sitepatent.com/?utm_source=unorouter.com&utm_medium=badge",
    src: "https://sitepatent.com/api/badge?style=classic",
    name: "SitePatent",
    width: 181,
    height: 46,
  },
  {
    href: "https://mediapronet.com/?utm_source=unorouter.com&utm_medium=badge",
    src: "https://mediapronet.com/api/badge?style=classic",
    name: "MediaProNet",
    width: 181,
    height: 46,
  },
] as const;

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
            onClick={() =>
              analytics.navigation.footerLinkClicked({
                key: item.key,
                external: false,
              })
            }
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
      id: "youtube",
      href: env.youtubeUrl,
      icon: "brand-youtube",
      label: "YouTube",
    },
  ] as const;

  return (
    <footer className="bg-muted/30 relative overflow-hidden rounded-t-3xl border-t md:rounded-t-[4rem]">
      <div className="absolute inset-0 -z-10">
        <div className="bg-primary/30 dark:bg-primary/10 absolute bottom-0 left-0 h-64 w-64 rounded-full blur-3xl"></div>
        <div className="bg-primary/30 dark:bg-primary/10 absolute top-1/4 right-0 h-72 w-72 rounded-full blur-3xl"></div>
      </div>
      <div className="mx-auto max-w-6xl px-5 pt-16 pb-8">
        <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-5">
          <div className="col-span-1 text-center md:col-span-2 md:text-left">
            <div className="mb-4 flex items-center justify-center gap-2 md:justify-start">
              <LogoImage />
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
                      onClick={() =>
                        analytics.navigation.socialClicked(social.id)
                      }
                    >
                      <Icon name={social.icon} className="h-5 w-5" />
                    </NextLink>
                  ),
              )}
            </div>
          </div>

          <div className="col-span-1 flex justify-center gap-8 md:contents">
            <div className="text-center md:col-span-1 md:text-left">
              <h3 className="mb-4 font-semibold">{t("FOOTER.PRODUCT")}</h3>
              <ul className="space-y-2">
                <FooterLinks links={NAV_LINKS} pathname={pathname} />
                {EXTERNAL_NAV_LINKS.map((item) => (
                  <li key={item.key}>
                    <NextLink
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground/70 hover:text-foreground inline-flex items-center justify-center gap-2 transition-colors md:justify-start"
                      onClick={() =>
                        analytics.navigation.footerLinkClicked({
                          key: item.key,
                          external: true,
                        })
                      }
                    >
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                      {t(item.key)}
                    </NextLink>
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-center md:col-span-1 md:text-left">
              <h3 className="mb-4 font-semibold">{t("FOOTER.LEGAL")}</h3>
              <ul className="space-y-2">
                <FooterLinks links={LEGAL_LINKS} pathname={pathname} />
              </ul>
            </div>
          </div>

          <div className="col-span-1 text-center md:text-left">
            <h3 className="mb-4 font-semibold">{t("FOOTER.CONTACT_TITLE")}</h3>
            <div className="text-foreground/70 space-y-2 text-sm">
              <p>{t("FOOTER.CONTACT_SUBTITLE")}</p>
              <NextLink
                href={`mailto:${env.supportEmail}`}
                className="text-primary hover:underline"
                onClick={() => analytics.navigation.supportEmailClicked()}
              >
                {env.supportEmail}
              </NextLink>
            </div>
          </div>
        </div>

        <div className="border-muted/50 flex flex-wrap items-center justify-center gap-4 border-t pt-8 pb-4 opacity-70">
          {[...FEATURED_BADGES, ...RECIPROCAL_LINKS].map((badge) => (
            <NextLink
              key={badge.href}
              href={badge.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={badge.src}
                alt={t(
                  "verified" in badge && badge.verified
                    ? "FOOTER.BADGE_VERIFIED_ON"
                    : "FOOTER.BADGE_FEATURED_ON",
                  { name: badge.name },
                )}
                width={badge.width}
                height={24}
                className="h-6 w-auto"
              />
            </NextLink>
          ))}
        </div>

        <div className="border-muted/50 relative border-t pt-8">
          <div className="via-primary/70 absolute top-0 left-1/2 h-px w-1/2 -translate-x-1/2 bg-linear-to-r from-transparent to-transparent"></div>
          <div className="text-foreground/70 relative flex items-center justify-center text-sm">
            <p className="text-center" suppressHydrationWarning>
              {t("FOOTER.COPYRIGHT", {
                year: String(dayjs().year()),
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
