import { routing } from "@/i18n/routing";
import { LOCALES } from "@/lib/config/constants";
import { Viewport } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Inter, JetBrains_Mono, Orbitron, Space_Grotesk, Fira_Code } from "next/font/google";
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

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["600", "800"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  weight: ["400", "500"],
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
        className={`${inter.variable} ${jetbrainsMono.variable} ${orbitron.variable} ${spaceGrotesk.variable} ${firaCode.variable} flex min-h-full flex-col antialiased font-sans`}
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
