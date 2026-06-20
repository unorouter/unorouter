import { AffiliateCapture } from "@/components/pages/auth/affiliate-capture";
import { AuthRedirectCapture } from "@/components/pages/auth/auth-redirect-capture";
import { Providers } from "@/components/provider/providers";
import { SwRegister } from "@/components/provider/app/sw-register";
import { Toaster } from "@/components/ui/sonner";
import {
  buildThemeCss,
  themeDataAttrs,
} from "@/components/ui/theme/theme-build-css";
import { allFontVariablesClass } from "@/components/ui/theme/theme-fonts";
import { getServerTheme } from "@/components/ui/theme/theme-server";
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
import { getTranslations } from "next-intl/server";
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
  // touch-action:manipulation + pinned sticky composer kill zoom-drift, so pinch-zoom stays enabled; cap 5x.
  maximumScale: 5,
  // Keyboard resizes layout instead of panning it; keeps header + composer in view.
  interactiveWidget: "resizes-content",
  // Required for env(safe-area-inset-*) to be non-zero on notched devices.
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

export default async function LocaleLayout(props: Props) {
  const params = await props.params;

  if (!hasLocale(routing.locales, params.locale)) notFound();

  const theme = await getServerTheme();
  const themeCss = buildThemeCss(theme);

  return (
    <html
      lang={params.locale}
      {...themeDataAttrs(theme)}
      /* next-themes injects the class via inline script pre-hydration */
      suppressHydrationWarning
    >
      <head>
        {/* Anti-FOUC: set the theme class before paint (next-themes' own script runs too late, in body). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("theme");var d=t==="dark"||((!t||t==="system")&&matchMedia("(prefers-color-scheme: dark)").matches);var c=document.documentElement.classList;c.toggle("dark",d);c.toggle("light",!d)}catch(e){}`,
          }}
        />
        {themeCss ? (
          // href+precedence = React hoistable style tracked by href, so extension-injected styles cannot replace theme CSS at hydration.
          <style
            id="user-theme"
            href="user-theme"
            precedence="user-theme"
            dangerouslySetInnerHTML={{ __html: themeCss }}
          />
        ) : null}
      </head>
      <body
        className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} ${allFontVariablesClass} flex min-h-dvh flex-col font-sans antialiased`}
      >
        <JsonLd id="organization-jsonld" data={buildOrganizationSchema()} />
        <JsonLd id="website-jsonld" data={buildWebSiteSchema(params.locale)} />
        <Providers>
          <Toaster richColors />
          <SwRegister />
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
