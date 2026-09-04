import { InlineRepairScript } from "@/components/elements/feedback/inline-repair";
import { getPageMetadata } from "@/lib/seo/metadata";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    href: "/recover",
    title: t("MAIN.RECOVER.TITLE"),
    description: t("MAIN.RECOVER.DESCRIPTION"),
    keywords: t("METADATA.KEYWORDS"),
  });
}

// Server-rendered only, no client components: this page has to work while
// every chunk request hangs. It is precached by the service worker so the
// worker's own cache serves it in exactly that state.
export default async function RecoverPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  const next = `/${locale}/chat`;
  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="bg-card text-card-foreground w-full max-w-md rounded-xl border p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold">{t("MAIN.RECOVER.TITLE")}</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          {t("MAIN.RECOVER.DESCRIPTION")}
        </p>
        <a
          href={next}
          className="text-primary mt-4 inline-block text-sm underline"
        >
          {t("MAIN.ACTIONS.TRY_AGAIN")}
        </a>
      </div>
      <InlineRepairScript auto={next} />
    </div>
  );
}
