import { AffiliateCapture } from "@/components/pages/auth/affiliate-capture";
import { AuthRedirectCapture } from "@/components/pages/auth/auth-redirect-capture";
import { ClientRuntimeGuards } from "@/components/provider/app/client-runtime-guards";
import { SwRegister } from "@/components/provider/app/sw-register";
import dynamic from "next/dynamic";
import { Providers } from "@/components/provider/providers";
import {
  buildThemeCss,
  themeDataAttrs,
} from "@/components/ui/theme/theme-build-css";
import { allFontVariablesClass } from "@/components/ui/theme/theme-fonts";
import { INITIAL_USER_THEME } from "@/components/ui/theme/theme-store";
import { APP_VALUES } from "@/lib/config/constants";
import { JsonLd } from "@/lib/seo/json-ld";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import {
  buildOrganizationSchema,
  buildWebSiteSchema,
} from "@/lib/seo/structured-data";
import { serverLocale } from "@/lib/utils/server";
import { Viewport } from "next";
import { getTranslations } from "next-intl/server";
import {
  JetBrains_Mono,
  Plus_Jakarta_Sans,
  Space_Grotesk,
} from "next/font/google";
import "../globals.css";

// The chat shell is h-dvh, and dvh only shrinks for the keyboard when the
// LAYOUT viewport does. Chromium/Firefox default to resizes-visual since Chrome
// 108, so without this the composer sits under the keyboard on Android. WebKit
// has not implemented the key at all (bug 259770): it logs "Viewport argument
// key not recognized" and falls back to resizes-visual, which is iOS's native
// behavior anyway, so shipping it statically is safe on both engines.
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

const Toaster = dynamic(() =>
  import("@/components/ui/sonner").then((m) => ({ default: m.Toaster })),
);

const NotifyProvider = dynamic(() =>
  import("@/components/provider/app/notify-provider").then((m) => ({
    default: m.NotifyProvider,
  })),
);

const DEFAULT_THEME_ATTRS = themeDataAttrs(INITIAL_USER_THEME);
const DEFAULT_THEME_CSS = buildThemeCss(INITIAL_USER_THEME);

export default async function LocaleLayout(props: Props) {
  const params = await props.params;

  return (
    <html
      lang={params.locale}
      {...DEFAULT_THEME_ATTRS}
      suppressHydrationWarning
    >
      <head>
        {/* next-themes emits this too, but inline where its provider mounts,
            and ours is in <body> (it needs the jotai/query context), so that
            copy runs after first paint. A second head-level provider emits the
            script twice; next-themes does not dedupe across React trees. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("theme");var d=t==="dark"||((!t||t==="system")&&matchMedia("(prefers-color-scheme: dark)").matches);var c=document.documentElement.classList;c.toggle("dark",d);c.toggle("light",!d)}catch(e){}`,
          }}
        />
        {/* Plain style, no href/precedence: UserThemeProvider mutates this
            node's textContent for live edits, which React's float cache would
            otherwise discard. */}
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
          <NotifyProvider />
          <ClientRuntimeGuards />
          <AffiliateCapture />
          <AuthRedirectCapture />
          {props.children}
        </Providers>
      </body>
    </html>
  );
}
