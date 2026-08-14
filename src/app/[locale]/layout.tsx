import { AffiliateCapture } from "@/components/pages/auth/affiliate-capture";
import { AuthRedirectCapture } from "@/components/pages/auth/auth-redirect-capture";
import { Providers } from "@/components/provider/providers";
import { NotifyProvider } from "@/components/provider/app/notify-provider";
import { InteractiveWidgetMeta } from "@/components/provider/app/interactive-widget-meta";
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
import { APP_VALUES } from "@/lib/config/constants";
import { JsonLd } from "@/lib/seo/json-ld";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import {
  buildOrganizationSchema,
  buildWebSiteSchema,
} from "@/lib/seo/structured-data";
import { routing } from "@/i18n/routing";
import { serverLocale } from "@/lib/utils/server";
import { Viewport } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  JetBrains_Mono,
  Plus_Jakarta_Sans,
  Space_Grotesk,
} from "next/font/google";
import { Suspense } from "react";
import "../globals.css";

// interactive-widget=resizes-content is deliberately NOT in the static meta.
// iOS 26 half-honors it: device diagnostics show the layout viewport animating
// through a dozen intermediate heights per keyboard cycle (660 -> 426 -> 578 ->
// ... -> 747 -> 660) and getting STUCK mid-dismiss (innerHeight parked at 578
// on a 660 screen), which cut the composer off by the difference. Chromium
// honors it correctly and needs it (the shell then resizes natively for the
// keyboard), so InteractiveWidgetMeta appends it at runtime on non-WebKit only.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
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
  // No network reads here. This is the ROOT metadata, so anything uncached in
  // it renders the head of every route under [locale] dynamically and blocks
  // their prerender. METADATA.DESCRIPTION carries no {modelCount} placeholder
  // in any of the 18 locales, so the pricing lookup this used to await was
  // fetched and then discarded.
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });

  return getPageMetadata({
    locale,
    href: "/",
    title: t("METADATA.TITLE", APP_VALUES),
    description: t("METADATA.DESCRIPTION"),
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

  // Without this, awaiting requestLocale in i18n/request.ts counts as
  // uncached request data and cacheComponents fails every [locale] prerender.
  // The unknown-locale notFound() guard stays in i18n/request.ts.
  if (hasLocale(routing.locales, params.locale)) {
    setRequestLocale(params.locale);
  }

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
          <InteractiveWidgetMeta />
          <NotifyProvider />
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
