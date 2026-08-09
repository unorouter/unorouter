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

// Directory badges render at h-6; width is the intrinsic ratio hint. Swap a
// badge between hosted and self-hosted src by editing its entry only.
// liveFrom marks a listing that only goes public on a scheduled launch date; the
// badge appears one day earlier so the directory can verify it before going live.
const FOOTER_BADGES: {
  href: string;
  src: string;
  name: string;
  width: number;
  liveFrom?: string;
  verified?: boolean;
}[] = [
  {
    href: "https://startupfa.me/s/unorouter?utm_source=unorouter.com",
    src: "/badges/startupfame.webp",
    name: "Startup Fame",
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
    href: "https://twelve.tools/unorouter",
    src: "/badges/twelvetools.svg",
    name: "Twelve Tools",
    width: 89,
  },
  {
    href: "https://fazier.com/launches/unorouter",
    src: "/badges/fazier.svg",
    name: "Fazier",
    width: 102,
  },
  {
    href: "https://www.producthunt.com/products/unorouter",
    src: "/badges/producthunt.svg",
    name: "Product Hunt",
    width: 111,
  },
  {
    href: "https://thesaasdir.com/product/unorouter?ref=badge",
    src: "/badges/thesaasdir.svg",
    name: "TheSaaSDir",
    width: 182,
  },
  {
    href: "https://turbo0.com/item/unorouter",
    src: "/badges/turbo0.svg",
    name: "Turbo0",
    width: 72,
  },
  {
    href: "https://codetrendy.com/listing/unorouter?utm_source=unorouter.com&utm_medium=badge",
    src: "/badges/codetrendy.svg",
    name: "CodeTrendy",
    width: 181,
  },
  {
    href: "https://sitepatent.com/listing/unorouter?utm_source=unorouter.com&utm_medium=badge",
    src: "/badges/sitepatent-listing.svg",
    name: "SitePatent",
    width: 181,
  },
  {
    href: "https://mediapronet.com/listing/unorouter?utm_source=unorouter.com&utm_medium=badge",
    src: "/badges/mediapronet.svg",
    name: "MediaProNet",
    width: 181,
  },
  {
    href: "https://launchboosts.com/project/unorouter",
    src: "/badges/launchboosts.svg",
    name: "LaunchBoosts",
    width: 153,
  },
  {
    href: "https://launchbuff.com",
    src: "https://launchbuff.com/badge-featured-dark.svg",
    name: "LaunchBuff",
    width: 160,
  },
  {
    href: "https://ufind.best/products/unorouter?utm_source=ufind.best",
    src: "/badges/ufind.svg",
    name: "ufind.best",
    width: 139,
  },
  {
    href: "https://neeed.directory/products/unorouter?utm_source=unorouter",
    src: "https://neeed.directory/badges/neeed-badge-light.svg",
    name: "Neeed Directory",
    width: 139,
  },
  {
    href: "https://dailypings.com/p/unorouter",
    src: "https://dailypings.com/badge.svg",
    name: "DailyPings",
    width: 179,
  },
  {
    href: "https://unitelist.com/product/unorouter",
    src: "https://unitelist.com/assets/images/badge.png",
    name: "Unite List",
    width: 150,
  },
  {
    href: "https://dofollow.tools",
    src: "https://dofollow.tools/badge/badge_dark.svg",
    name: "Dofollow.Tools",
    width: 150,
  },
  {
    href: "https://roozna.com/project/unorouter",
    src: "https://roozna.com/api/badge/unorouter",
    name: "Roozna",
    width: 150,
  },
  {
    href: "https://firstlook.tools",
    src: "https://firstlook.tools/badge/badge_dark.svg",
    name: "First Look",
    width: 150,
  },
  {
    href: "https://yo.directory",
    src: "https://assets.yo.directory/badges/yo-directory-featured-dark.svg",
    name: "Yo.directory",
    width: 150,
  },
  {
    href: "https://acidtools.com/ai/unorouter",
    src: "https://acidtools.com/assets/images/badge-dark.png",
    name: "Acid Tools",
    width: 150,
  },
  {
    href: "https://tools.launchllama.co?utm_source=badge&utm_medium=referral",
    src: "https://tools.launchllama.co/featured-badge.png?v=2",
    name: "As seen on Launch Llama Newsletter",
    width: 150,
  },
  {
    href: "https://aibesttop.com",
    src: "/badges/aibesttop.svg",
    name: "AIBestTop",
    width: 72,
  },
  {
    href: "https://ailaunch.space/",
    src: "/badges/ailaunchspace.svg",
    name: "AI Launch Space",
    width: 89,
  },
  {
    href: "https://dododirectory.com",
    src: "/badges/dododirectory.png",
    name: "DodoDirectory",
    width: 103,
  },
  {
    href: "https://fastlaunch.io",
    src: "https://fastlaunch.io/images/badges/featured-light.svg",
    name: "FastLaunch",
    width: 103,
  },
  {
    href: "https://sharefast.co/?ref=4cxuvlcalisrnt6j",
    src: "https://sharefast.co/sharefast-featured-badge.svg",
    name: "Share Fast",
    width: 110,
  },
  {
    href: "https://huzzler.so/products/colhB77fuA/unorouter?utm_source=huzzler_product_website&utm_medium=badge&utm_campaign=badge",
    src: "/badges/huzzler.png",
    name: "Huzzler",
    width: 81,
  },
  {
    href: "https://postmake.io",
    src: "/badges/postmake.png",
    name: "Postmake",
    width: 103,
  },
  {
    href: "https://saasbison.com",
    src: "https://saasbison.com/badge.png",
    name: "SaaSBison",
    width: 111,
  },
  {
    href: "https://sumodir.com",
    src: "https://sumodir.com/badge.png",
    name: "SumoDir",
    width: 111,
  },
  {
    href: "https://www.stork.ai/",
    src: "https://www.stork.ai/badge/verified-dark.svg",
    name: "Stork Verified",
    width: 120,
  },
  {
    href: "https://startupbase.io/products/unorouter?utm_source=startupbase&utm_medium=badge&utm_campaign=launch-badge-light",
    src: "https://statics.startupbase.io/site/badges/launched-on-sb.svg",
    name: "StartupBase",
    width: 132,
  },
  {
    href: "https://findyoursaas.com/tool/unorouter",
    src: "/badges/findyoursaas.png",
    name: "FindYourSaaS",
    width: 24,
  },
  {
    href: "https://openhunts.com",
    src: "https://cdn.openhunts.com/badges/club.webp",
    name: "OpenHunts",
    width: 111,
  },
  {
    href: "https://showmebest.ai",
    src: "https://showmebest.ai/badge/feature-badge-white.webp",
    name: "ShowMeBestAI",
    width: 220,
  },
  {
    href: "https://saasgrow.app?ref=unorouter.com",
    src: "https://saasgrow.app/api/badge?type=featured&style=light",
    name: "SaaSGrow",
    width: 240,
  },
  {
    href: "https://wired.business",
    src: "https://wired.business/badge0-white.svg",
    name: "Wired Business",
    width: 200,
  },
  {
    href: "https://findly.tools/unorouter?utm_source=unorouter",
    src: "https://findly.tools/badges/findly-tools-badge-light.svg",
    name: "Findly.tools",
    width: 175,
  },
  {
    href: "https://scoutforge.net/apps/unorouter?ref=badge",
    src: "https://scoutforge.net/badge/unorouter/image?theme=light",
    name: "Scout Forge",
    width: 300,
  },
] as const;

// Directories that require a plain text backlink instead of an image badge, and
// delist the entry if the link is removed.
const FOOTER_TEXT_LINKS = [
  { href: "https://www.seewhatnewai.com", label: "SeeWhatNewAI" },
  { href: "https://www.toolpilot.ai", label: "Toolpilot.ai" },
  { href: "https://animatephoto.io", label: "Animate Photo AI" },
  { href: "https://lookaitools.com", label: "LookAITools" },
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

  // Build-date clock: dayjs() (now) is non-deterministic in prerenders and
  // ejects every page from the PPR static shell ("render in browser" abort).
  const visibleBadges = FOOTER_BADGES.filter(
    (badge) =>
      !("liveFrom" in badge) ||
      !dayjs(process.env.NEXT_PUBLIC_BUILD_DATE).isBefore(
        dayjs(badge.liveFrom).subtract(1, "day"),
        "day",
      ),
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
    <footer className="bg-muted/30 relative overflow-hidden rounded-t-3xl border-t md:rounded-t-[4rem]">
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
              <h2 className="mb-4 font-semibold">{t("FOOTER.PRODUCT")}</h2>
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
                onClick={() => analytics.navigation.supportEmailClicked()}
              >
                {env.supportEmail}
              </NextLink>
            </div>
          </div>
        </div>

        <div className="border-muted/50 flex flex-wrap items-center justify-center gap-4 border-t pt-8 pb-4 opacity-70">
          {visibleBadges.map((badge) => (
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
                loading="lazy"
                decoding="async"
                className="h-6 w-auto"
              />
            </NextLink>
          ))}
        </div>

        <div className="text-foreground/50 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pb-4 text-xs">
          {FOOTER_TEXT_LINKS.map((link) => (
            <NextLink
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground/70 transition-colors"
            >
              {link.label}
            </NextLink>
          ))}
        </div>

        <div className="border-muted/50 relative border-t pt-8">
          <div className="via-primary/70 absolute top-0 left-1/2 h-px w-1/2 -translate-x-1/2 bg-linear-to-r from-transparent to-transparent"></div>
          <div className="text-foreground/70 relative flex items-center justify-center text-sm">
            <p className="text-center" suppressHydrationWarning>
              {t("FOOTER.COPYRIGHT", {
                // Build-date year: the clock is non-deterministic in prerenders.
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
