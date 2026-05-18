"use client";

import { CompanyName, LogoImage } from "@/components/elements/brand/brand";
import { BreakoutDialog } from "@/components/ui/breakout/breakout-dialog";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";
import { analytics } from "@/lib/analytics";
import { APP_VALUES, msg } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { isActiveLink } from "./navigation";

const NAV_LINKS = [
  { href: "/models", key: msg("FOOTER.MODELS") },
  { href: "/pricing", key: msg("FOOTER.PRICING") },
  { href: "/docs", key: msg("FOOTER.DOCUMENTATION") },
] as const;

const EXTERNAL_NAV_LINKS = [
  { href: env.statusUrl, key: msg("FOOTER.STATUS") },
] as const;

const LEGAL_LINKS = [
  { href: "/terms", key: msg("FOOTER.TERMS") },
  { href: "/privacy", key: msg("FOOTER.PRIVACY") },
] as const;

export function Footer() {
  const t = useTranslations();
  const pathname = usePathname();
  const [breakoutOpen, setBreakoutOpen] = useState(false);

  return (
    <footer className="bg-muted/30 relative overflow-hidden rounded-t-3xl border-t md:rounded-t-[4rem]">
      <div className="absolute inset-0 -z-10">
        <div className="bg-primary/30 dark:bg-primary/10 absolute bottom-0 left-0 h-64 w-64 rounded-full blur-3xl"></div>
        <div className="bg-primary/30 dark:bg-primary/10 absolute top-1/4 right-0 h-72 w-72 rounded-full blur-3xl"></div>
      </div>
      <div className="mx-auto max-w-6xl px-5 pt-16 pb-8">
        <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-5">
          {/* Brand Section */}
          <div className="col-span-1 text-center md:col-span-2 md:text-left">
            <div className="mb-4 flex items-center justify-center gap-2 md:justify-start">
              <LogoImage />
              <CompanyName className="text-2xl" />
            </div>
            <p className="text-muted-foreground mx-auto mb-6 max-w-md md:mx-0">
              {t("FOOTER.DESCRIPTION")}
            </p>
            <div className="flex justify-center space-x-3 md:justify-start">
              {env.githubUrl && (
                <NextLink
                  href={env.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-background hover:bg-muted rounded-full p-2 transition-colors"
                  aria-label="GitHub"
                  onClick={() => analytics.navigation.socialClicked("github")}
                >
                  <Icon name="brand-github" className="h-5 w-5" />
                </NextLink>
              )}
              {env.discordUrl && (
                <NextLink
                  href={env.discordUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-background hover:bg-muted rounded-full p-2 transition-colors"
                  aria-label="Discord"
                  onClick={() => analytics.navigation.socialClicked("discord")}
                >
                  <Icon name="brand-discord" className="h-5 w-5" />
                </NextLink>
              )}
              {env.twitterUrl && (
                <NextLink
                  href={env.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-background hover:bg-muted rounded-full p-2 transition-colors"
                  aria-label="X"
                  onClick={() => analytics.navigation.socialClicked("x")}
                >
                  <Icon name="brand-x-twitter" className="h-5 w-5" />
                </NextLink>
              )}
              {env.trustpilotUrl && (
                <NextLink
                  href={env.trustpilotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-background hover:bg-muted rounded-full p-2 transition-colors"
                  aria-label={t("FOOTER.SOCIAL_TRUSTPILOT")}
                  onClick={() =>
                    analytics.navigation.socialClicked("trustpilot")
                  }
                >
                  <Icon name="brand-trustpilot" className="h-5 w-5" />
                </NextLink>
              )}
            </div>
          </div>

          <div className="col-span-1 flex justify-center gap-8 md:contents">
            {/* Navigation Section */}
            <div className="text-center md:col-span-1 md:text-left">
              <h3 className="mb-4 font-semibold">{t("FOOTER.PRODUCT")}</h3>
              <ul className="space-y-2">
                {NAV_LINKS.map((item) => (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      className={cn(
                        "text-muted-foreground hover:text-foreground transition-colors",
                        isActiveLink(pathname, item.href) &&
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
                {EXTERNAL_NAV_LINKS.map((item) => (
                  <li key={item.key}>
                    <NextLink
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-2 transition-colors md:justify-start"
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

            {/* Legal Section */}
            <div className="text-center md:col-span-1 md:text-left">
              <h3 className="mb-4 font-semibold">{t("FOOTER.LEGAL")}</h3>
              <ul className="space-y-2">
                {LEGAL_LINKS.map((item) => (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      className={cn(
                        "text-muted-foreground hover:text-foreground transition-colors",
                        isActiveLink(pathname, item.href) &&
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
              </ul>
            </div>
          </div>

          {/* Contact Section */}
          <div className="col-span-1 text-center md:text-left">
            <h3 className="mb-4 font-semibold">{t("FOOTER.CONTACT_TITLE")}</h3>
            <div className="text-muted-foreground space-y-2 text-sm">
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

        {/* Copyright */}
        <div className="border-muted/50 relative border-t pt-8">
          <div className="via-primary/70 absolute top-0 left-1/2 h-px w-1/2 -translate-x-1/2 bg-linear-to-r from-transparent to-transparent"></div>
          <div className="text-muted-foreground relative flex items-center justify-center text-sm">
            <p className="text-center" suppressHydrationWarning>
              {t("FOOTER.COPYRIGHT", {
                year: String(dayjs().year()),
                ...APP_VALUES,
              })}
            </p>
            <button
              type="button"
              onClick={() => {
                analytics.easterEgg.breakoutOpened({
                  from_route: pathname,
                });
                setBreakoutOpen(true);
              }}
              aria-label={t("FOOTER.EASTER_EGG_LABEL")}
              className="text-muted-foreground/30 hover:text-primary absolute right-0 font-mono text-xs leading-none transition-colors"
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
