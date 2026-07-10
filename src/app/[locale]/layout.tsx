import { AffiliateCapture } from "@/components/pages/auth/affiliate-capture";
import { AuthRedirectCapture } from "@/components/pages/auth/auth-redirect-capture";
import { Providers } from "@/components/provider/providers";
import { SwRegister } from "@/components/provider/app/sw-register";
import { DebugCapture } from "@/components/provider/app/debug-capture";
import { Toaster } from "@/components/ui/sonner";
import {
  buildThemeCss,
  themeDataAttrs,
} from "@/components/ui/theme/theme-build-css";
import { allFontVariablesClass } from "@/components/ui/theme/theme-fonts";
import {
  INITIAL_USER_THEME,
  USER_THEME_KEY,
} from "@/components/ui/theme/theme-store";
import { routing } from "@/i18n/routing";
import { APP_VALUES } from "@/lib/config/constants";
import { rpc } from "@/lib/rpc";
import { JsonLd } from "@/lib/seo/json-ld";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import {
  buildOrganizationSchema,
  buildWebSiteSchema,
} from "@/lib/seo/structured-data";
import { handleElysia } from "@/lib/utils/base";
import { serverLocale } from "@/lib/utils/server";
import { Viewport } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  JetBrains_Mono,
  Plus_Jakarta_Sans,
  Space_Grotesk,
} from "next/font/google";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import "../globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  interactiveWidget: "resizes-content",
  viewportFit: "cover",
};

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "optional",
  preload: false,
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "optional",
  preload: false,
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  display: "optional",
  preload: false,
});

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const [t, pricing] = await Promise.all([
    getTranslations({ locale }),
    rpc.api.models.pricing
      .get()
      .then((r) => handleElysia(r))
      .catch(() => null),
  ]);

  return getPageMetadata({
    locale,
    href: "/",
    title: t("METADATA.TITLE", APP_VALUES),
    description: t("METADATA.DESCRIPTION", {
      modelCount: String(pricing?.modelCount),
    }),
    keywords: t("METADATA.KEYWORDS"),
    ogImage: ogBadge("hero", locale),
  });
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

// The shell ships the DEFAULT theme (static, no cookie read); the pre-paint
// script below applies custom data-attrs from the cookie before first paint
// and UserThemeProvider swaps in the full custom CSS at hydration.
const DEFAULT_THEME_ATTRS = themeDataAttrs(INITIAL_USER_THEME);
const DEFAULT_THEME_CSS = buildThemeCss(INITIAL_USER_THEME);

export default async function LocaleLayout(props: Props) {
  const params = await props.params;

  if (!hasLocale(routing.locales, params.locale)) notFound();
  setRequestLocale(params.locale);

  return (
    <html
      lang={params.locale}
      {...DEFAULT_THEME_ATTRS}
      suppressHydrationWarning
    >
      <head>
        {/* Anti-FOUC: set the theme class before paint (next-themes' own script runs too late, in body). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("theme");var d=t==="dark"||((!t||t==="system")&&matchMedia("(prefers-color-scheme: dark)").matches);var c=document.documentElement.classList;c.toggle("dark",d);c.toggle("light",!d)}catch(e){}try{var m=document.cookie.match(/(?:^|; )${USER_THEME_KEY}=([^;]*)/);if(m){var th=JSON.parse(decodeURIComponent(m[1]));var h=document.documentElement;if(th.style)h.setAttribute("data-style",th.style);if(th.menu)h.setAttribute("data-menu",th.menu);if(th.menuAccent)h.setAttribute("data-menu-accent",th.menuAccent);if(th.iconLibrary)h.setAttribute("data-icon-library",th.iconLibrary)}}catch(e){}`,
          }}
        />
        {/* User-theme CSS SSR'd from the cookie (authoritative, matches the <html data-*> above, no
            FOUC). UserThemeProvider mutates THIS node's content client-side for live edits; a plain
            style (no href/precedence) lets that imperative update stick without React's float cache. */}
        <style
          id="user-theme"
          dangerouslySetInnerHTML={{ __html: DEFAULT_THEME_CSS }}
        />
      </head>
      <body
        className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} ${allFontVariablesClass} flex min-h-dvh flex-col font-sans antialiased`}
      >
        <JsonLd id="organization-jsonld" data={buildOrganizationSchema()} />
        <JsonLd id="website-jsonld" data={buildWebSiteSchema(params.locale)} />
        <Providers>
          <Toaster richColors />
          <SwRegister />
          <DebugCapture />
          <Suspense>
            <AffiliateCapture />
            <AuthRedirectCapture />
          </Suspense>
          {props.children}
        </Providers>
      </body>
    </html>
  );
}
