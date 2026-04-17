import { APP_VALUES } from "@/lib/config/constants";
import { serverLocale } from "@/lib/utils/server";
import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";

export async function GET(
  _request: Request,
  props: { params: Promise<{ locale: string }> },
) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });

  const manifest: MetadataRoute.Manifest = {
    name: t("METADATA.MANIFEST.NAME", APP_VALUES),
    short_name: t("METADATA.MANIFEST.SHORT_NAME", APP_VALUES),
    description: t("METADATA.MANIFEST.DESCRIPTION"),
    lang: locale,
    start_url: `/${locale}`,
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  return Response.json(manifest, {
    headers: { "content-type": "application/manifest+json" },
  });
}
