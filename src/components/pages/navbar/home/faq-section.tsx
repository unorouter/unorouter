import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { JsonLd } from "@/lib/seo/json-ld";
import { buildFAQPageSchema } from "@/lib/seo/structured-data";
import { getTranslations } from "next-intl/server";

const ENTRIES = [
  { q: "HOME.FAQ.Q1", a: "HOME.FAQ.A1" },
  { q: "HOME.FAQ.Q2", a: "HOME.FAQ.A2" },
  { q: "HOME.FAQ.Q3", a: "HOME.FAQ.A3" },
  { q: "HOME.FAQ.Q4", a: "HOME.FAQ.A4" },
] as const;

// Answers the questions people type next to the brand ("is it free", "is it
// safe", "is it down"), which otherwise landed on unrelated pages.
export async function FaqSection() {
  const t = await getTranslations();
  const entries = ENTRIES.map((e) => ({
    question: t(e.q, APP_VALUES),
    answer: t(e.a, APP_VALUES),
  }));

  return (
    <section className="relative z-10 mx-auto max-w-3xl px-6 py-16">
      <JsonLd id="home-faq" data={buildFAQPageSchema(entries)} />
      <h2 className="mb-8 text-2xl font-bold tracking-tight">
        {t("HOME.FAQ.TITLE", APP_VALUES)}
      </h2>
      <dl className="space-y-6">
        {entries.map((e) => (
          <div key={e.question}>
            <dt className="font-semibold">{e.question}</dt>
            <dd className="text-muted-foreground mt-1 text-sm leading-relaxed">
              {e.answer}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs">
        <Link
          href={{
            pathname: "/docs/integrations/[slug]",
            params: { slug: "janitor-ai" },
          }}
          className="underline underline-offset-4"
        >
          {t("DOCS.JANITOR_AI.TITLE")}
        </Link>
        <Link href="/docs/platform" className="underline underline-offset-4">
          {t("DOCS_PLATFORM.INDEX.META.TITLE", APP_VALUES)}
        </Link>
      </div>
    </section>
  );
}
