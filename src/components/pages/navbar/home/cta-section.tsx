import { Link } from "@/i18n/navigation";
import { LuChevronRight } from "react-icons/lu";
import { getTranslations } from "next-intl/server";

export async function CtaSection() {
  const t = await getTranslations();

  return (
    <section className="border-border/50 relative border-t px-6 py-32">
      <div className="mx-auto max-w-360 text-center">
        <div className="space-y-8">
          <h2 className="text-4xl font-bold tracking-tighter md:text-5xl">
            {t("HOME.CTA_TITLE_1")}{" "}
            <span className="text-purple-400">{t("HOME.CTA_TITLE_2")}</span>?
          </h2>
          <p className="text-muted-foreground mx-auto max-w-xl font-mono text-sm">
            {t("HOME.CTA_SUBTITLE")}
          </p>
          <div className="flex flex-col items-center justify-center gap-4 pt-4 font-mono text-xs sm:flex-row">
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL}/register`}
              className="bg-primary text-primary-foreground hover:bg-primary/80 flex h-12 w-full items-center justify-center gap-2 px-10 font-bold tracking-widest uppercase transition-colors sm:w-auto"
            >
              {t("HOME.CTA_PRIMARY")}
            </a>
            <Link
              href="/docs/claude-code"
              className="border-border text-foreground hover:border-foreground group flex h-12 w-full items-center justify-center gap-2 border bg-transparent px-10 font-bold tracking-widest uppercase transition-all sm:w-auto"
            >
              {t("HOME.CTA_SECONDARY")}
              <LuChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
