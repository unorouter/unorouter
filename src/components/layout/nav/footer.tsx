"use client";

import { CompanyName, LogoImage } from "@/components/elements/brand";
import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { FaGithub } from "react-icons/fa";
import { isActiveLink } from "./navigation";

const NAV_LINKS = [
  { href: "/models", key: "FOOTER.MODELS" },
  { href: "/pricing", key: "FOOTER.PRICING" },
  { href: "/docs/claude-code", key: "FOOTER.DOCUMENTATION" },
] as const;

const LEGAL_LINKS = [
  { href: "/terms", key: "FOOTER.TERMS" },
  { href: "/privacy", key: "FOOTER.PRIVACY" },
] as const;

export function Footer() {
  const t = useTranslations();
  const pathname = usePathname();

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
              <NextLink
                href={process.env.NEXT_PUBLIC_GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-background hover:bg-muted rounded-full p-2 transition-colors"
                aria-label="GitHub"
              >
                <FaGithub className="h-5 w-5" />
              </NextLink>
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
                          isActiveLink(pathname, item.href) && "text-primary font-medium",
                        )}
                      >
                        {t(item.key)}
                      </Link>
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
                          isActiveLink(pathname, item.href) && "text-primary font-medium",
                        )}
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
                href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`}
                className="text-primary hover:underline"
              >
                {process.env.NEXT_PUBLIC_SUPPORT_EMAIL}
              </NextLink>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-muted/50 relative border-t pt-8">
          <div className="via-primary/70 absolute top-0 left-1/2 h-px w-1/2 -translate-x-1/2 bg-linear-to-r from-transparent to-transparent"></div>
          <div className="text-muted-foreground flex flex-col items-center justify-center text-sm">
            <p className="text-center" suppressHydrationWarning>
              {t("FOOTER.COPYRIGHT", {
                year: String(new Date().getFullYear()),
                ...APP_VALUES,
              })}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
