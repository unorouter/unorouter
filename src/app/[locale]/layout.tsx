import { routing } from "@/i18n/routing";
import { LOCALES } from "@/lib/config/constants";
import { Viewport } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { use } from "react";
import { Footer } from "@/components/footer";
import { Providers } from "@/components/provider/providers";
import { Toaster } from "@/components/ui/sonner";
import "../globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(props: {
  params: Promise<{ locale: (typeof LOCALES)[number] }>;
}) {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale });
  return {
    title: t("METADATA.TITLE"),
    description: t("METADATA.DESCRIPTION"),
  };
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default function LocaleLayout(props: Props) {
  const params = use(props.params);

  if (!hasLocale(routing.locales, params.locale)) notFound();

  return (
    <html lang={params.locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-full flex-col antialiased`}
      >
        <Providers>
          <Toaster richColors />
          {props.children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
