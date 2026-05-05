import { AffiliateCapture } from "@/components/pages/auth/affiliate-capture";
import { AuthRedirectCapture } from "@/components/pages/auth/auth-redirect-capture";
import { Providers } from "@/components/provider/providers";
import { Toaster } from "@/components/ui/sonner";
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
  maximumScale: 5,
};

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const reqId = Math.random().toString(36).slice(2, 8);
  const tag = (label: string) => `[layout-meta:${reqId}] ${label}`;
  console.time(tag("total"));

  console.time(tag("serverLocale"));
  const locale = await serverLocale(props);
  console.timeEnd(tag("serverLocale"));

  console.time(tag("getTranslations+rpc.pricing.get"));
  const [t, pricing] = await Promise.all([
    (async () => {
      console.time(tag("getTranslations"));
      const r = await getTranslations({ locale });
      console.timeEnd(tag("getTranslations"));
      return r;
    })(),
    (async () => {
      console.time(tag("rpc.pricing.get"));
      const r = await rpc.api.pricing
        .get()
        .then((r) => handleElysia(r))
        .catch(() => null);
      console.timeEnd(tag("rpc.pricing.get"));
      return r;
    })(),
  ]);
  console.timeEnd(tag("getTranslations+rpc.pricing.get"));
  queueMicrotask(() => console.timeEnd(tag("total")));

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

  return (
    <html
      lang={params.locale}
      /* suppressHydrationWarning required: next-themes injects a class
         attribute via inline script before hydration to prevent theme flicker */
      suppressHydrationWarning
    >
      <body
        className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} flex min-h-screen flex-col font-sans antialiased`}
      >
        <JsonLd id="organization-jsonld" data={buildOrganizationSchema()} />
        <JsonLd id="website-jsonld" data={buildWebSiteSchema(params.locale)} />
        <Providers>
          <Toaster richColors />
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
