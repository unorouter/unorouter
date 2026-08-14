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
// lightBg: the host only ships dark artwork on transparency, which is invisible
// on this footer. It gets a light chip behind it rather than a swapped src, so
// the badge their verifier fetches stays byte-identical.
const FOOTER_BADGES: {
  href: string;
  src: string;
  name: string;
  width: number;
  liveFrom?: string;
  verified?: boolean;
  lightBg?: boolean;
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
    src: "/badges/launchbuff.svg",
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
    src: "/badges/neeed.svg",
    name: "Neeed Directory",
    width: 139,
  },
  {
    href: "https://dailypings.com/p/unorouter",
    src: "/badges/dailypings.svg",
    name: "DailyPings",
    width: 179,
  },
  {
    href: "https://unitelist.com/product/unorouter",
    src: "/badges/unitelist.png",
    name: "Unite List",
    width: 150,
  },
  {
    href: "https://dofollow.tools",
    src: "/badges/dofollow.svg",
    name: "Dofollow.Tools",
    width: 150,
  },
  {
    href: "https://roozna.com/project/unorouter",
    src: "/badges/roozna.svg",
    name: "Roozna",
    width: 150,
  },
  {
    href: "https://firstlook.tools",
    src: "/badges/firstlook.svg",
    name: "First Look",
    width: 150,
  },
  {
    href: "https://yo.directory",
    src: "/badges/yodirectory.svg",
    name: "Yo.directory",
    width: 150,
  },
  {
    href: "https://acidtools.com/ai/unorouter",
    src: "/badges/acidtools.png",
    name: "Acid Tools",
    width: 150,
  },
  {
    href: "https://tools.launchllama.co?utm_source=badge&utm_medium=referral",
    src: "/badges/launchllama.png",
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
    lightBg: true,
  },
  {
    href: "https://fastlaunch.io",
    src: "/badges/fastlaunch.svg",
    name: "FastLaunch",
    width: 103,
  },
  {
    href: "https://FridayHunt.com/projects/unorouter?ref=FridayHunt",
    src: "/badges/fridayhunt.svg",
    name: "FridayHunt",
    width: 103,
    lightBg: true,
  },
  {
    href: "https://sharefast.co/?ref=4cxuvlcalisrnt6j",
    src: "/badges/sharefast.svg",
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
    src: "/badges/saasbison.png",
    name: "SaaSBison",
    width: 111,
    lightBg: true,
  },
  {
    href: "https://sumodir.com",
    src: "/badges/sumodir.png",
    name: "SumoDir",
    width: 111,
  },
  {
    href: "https://www.stork.ai/",
    src: "/badges/stork.svg",
    name: "Stork Verified",
    width: 120,
  },
  {
    href: "https://startupbase.io/products/unorouter?utm_source=startupbase&utm_medium=badge&utm_campaign=launch-badge-light",
    src: "/badges/startupbase.svg",
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
    src: "/badges/openhunts.webp",
    name: "OpenHunts",
    width: 111,
  },
  {
    href: "https://showmebest.ai",
    src: "/badges/showmebest.webp",
    name: "ShowMeBestAI",
    width: 220,
  },
  {
    href: "https://saasgrow.app?ref=unorouter.com",
    src: "/badges/saasgrow.svg",
    name: "SaaSGrow",
    width: 240,
  },
  {
    href: "https://wired.business",
    src: "/badges/wired.svg",
    name: "Wired Business",
    width: 200,
  },
  {
    href: "https://findly.tools/unorouter?utm_source=unorouter",
    src: "/badges/findly.svg",
    name: "Findly.tools",
    width: 175,
  },
  {
    href: "https://scoutforge.net/apps/unorouter?ref=badge",
    src: "/badges/scoutforge.svg",
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

  // Build date, not the clock: a badge goes live with the first deploy on or
  // after its date, so server and client agree on what is visible.
  const visibleBadges = FOOTER_BADGES.filter(
    (badge) =>
      !("liveFrom" in badge) ||
      !dayjs(process.env.NEXT_PUBLIC_BUILD_DATE).isBefore(
        dayjs(badge.liveFrom).subtract(1, "day"),
        "day",
      ),
  );

  // Two marquee tracks. The text-only links ride the second row so they scroll
  // with everything else instead of sitting in their own static line.
  const badgeSplit = Math.ceil(visibleBadges.length / 2);
  const badgeRows: Array<
    Array<(typeof visibleBadges)[number] | (typeof FOOTER_TEXT_LINKS)[number]>
  > = [
    visibleBadges.slice(0, badgeSplit),
    [...visibleBadges.slice(badgeSplit), ...FOOTER_TEXT_LINKS],
  ];

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

        {/* Two drifting rows instead of a 4-row wall of logos. EVERY badge and
            text link stays in the server-rendered DOM: directories verify by
            fetching this HTML and grepping for their own link, and several
            (huzzler, dododirectory, saasbison) auto-delist when it is missing.
            So the track is DUPLICATED for the seam rather than virtualised, and
            the copy is aria-hidden + inert so it is neither announced twice nor
            tab-focusable. Pure CSS: no hooks, no measurement, so the footer
            stays in the PPR static shell. */}
        <div className="border-muted/50 space-y-4 border-t pt-8 pb-4">
          {badgeRows.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="marquee-row relative overflow-hidden opacity-70"
            >
              <div
                className={cn(
                  "flex w-max items-center gap-4",
                  rowIndex === 0
                    ? "animate-marquee-slow"
                    : "animate-marquee-slow-reverse",
                )}
              >
                {[false, true].map((isDup) => (
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
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0"
                          tabIndex={isDup ? -1 : undefined}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.src}
                            alt={t(
                              "verified" in item && item.verified
                                ? "FOOTER.BADGE_VERIFIED_ON"
                                : "FOOTER.BADGE_FEATURED_ON",
                              { name: item.name },
                            )}
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
                          rel="noopener noreferrer"
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
                // Build-date year, so server and client render the same string.
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
