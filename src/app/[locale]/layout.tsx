import { AffiliateCapture } from "@/components/pages/auth/affiliate-capture";
import { Providers } from "@/components/provider/providers";
import { Toaster } from "@/components/ui/sonner";
import { routing } from "@/i18n/routing";
import { APP_VALUES } from "@/lib/config/constants";
import { getPageMetadata } from "@/lib/config/metadata";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { serverLocale } from "@/lib/utils/server";
import { Viewport } from "next";
import { hasLocale } from "next-intl";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import {
  JetBrains_Mono,
  Plus_Jakarta_Sans,
  Space_Grotesk,
} from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
});

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const [t, pricing] = await Promise.all([
    getTranslations({ locale }),
    rpc.api.pricing
      .get()
      .then((r) => handleElysia(r))
      .catch(() => null),
  ]);

  return getPageMetadata({
    locale,
    title: t("METADATA.TITLE", APP_VALUES),
    description: t("METADATA.DESCRIPTION", {
      modelCount: String(pricing?.modelCount),
    }),
    keywords: t("METADATA.KEYWORDS"),
    ogImage: `/api/badge/hero?format=png&theme=dark&locale=${locale}`,
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
        <Providers>
          <Toaster richColors />
          <Suspense>
            <AffiliateCapture />
          </Suspense>
          {props.children}
        </Providers>
      </body>
    </html>
  );
}
