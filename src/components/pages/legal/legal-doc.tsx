import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import type { TranslationKey } from "@/lib/types";
import { getTranslations } from "next-intl/server";
import { Fragment } from "react";

type LegalPara = { key: string; values?: true };

export type LegalDocSection = {
  title: string;
  para?: LegalPara;
  intro?: LegalPara;
  items?: string[];
  outro?: LegalPara;
  subs?: { title: string; para: string }[];
};

export async function LegalDoc(props: {
  ns: "AUP" | "PRIVACY" | "REFUND" | "TERMS";
  sections: LegalDocSection[];
}) {
  const t = await getTranslations();
  const key = (leaf: string) => `${props.ns}.${leaf}` as TranslationKey;
  const para = (p: LegalPara) =>
    p.values ? t(key(p.key), APP_VALUES) : t(key(p.key));

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground mb-8 inline-block text-sm"
      >
        &larr; {t(key("TITLE"))}
      </Link>

      <h1 className="mb-2 text-3xl font-bold">{t(key("TITLE"))}</h1>
      <p className="text-muted-foreground mb-10 text-sm">
        {t(key("LAST_UPDATED"))}
      </p>

      <p className="text-muted-foreground mb-10 leading-relaxed">
        {t(key("INTRO"), APP_VALUES)}
      </p>

      {props.sections.map((s) => (
        <section key={s.title} className="mb-8">
          <h2 className="mb-3 text-xl font-semibold">{t(key(s.title))}</h2>
          {s.subs?.map((sub) => (
            <Fragment key={sub.title}>
              <h3 className="mt-4 mb-2 font-medium">{t(key(sub.title))}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {t(key(sub.para))}
              </p>
            </Fragment>
          ))}
          {s.para && (
            <p className="text-muted-foreground leading-relaxed">
              {para(s.para)}
            </p>
          )}
          {s.intro && (
            <p className="text-muted-foreground mb-3 leading-relaxed">
              {para(s.intro)}
            </p>
          )}
          {s.items && (
            <ul className="text-muted-foreground list-disc space-y-2 pl-6 leading-relaxed">
              {s.items.map((item) => (
                <li key={item}>{t(key(item))}</li>
              ))}
            </ul>
          )}
          {s.outro && (
            <p className="text-muted-foreground mt-3 leading-relaxed">
              {para(s.outro)}
            </p>
          )}
        </section>
      ))}
    </main>
  );
}
