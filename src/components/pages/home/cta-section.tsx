import { Link } from "@/i18n/navigation";
import { LuChevronRight } from "react-icons/lu";
import { getTranslations } from "next-intl/server";

export async function CtaSection() {
  const t = await getTranslations();

  return (
    <section className="relative py-32 px-6 border-t border-border/50">
      <div className="max-w-360 mx-auto text-center">
        <div className="space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tighter">
            {t("HOME.CTA_TITLE_1")}{" "}
            <span className="text-purple-400">{t("HOME.CTA_TITLE_2")}</span>?
          </h2>
          <p className="text-muted-foreground font-mono text-sm max-w-xl mx-auto">
            {t("HOME.CTA_SUBTITLE")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 font-mono text-xs pt-4">
            <a
              href="https://api.unorouter.ai/register"
              className="h-12 px-10 bg-primary text-primary-foreground font-bold uppercase tracking-widest hover:bg-primary/80 transition-colors w-full sm:w-auto flex items-center justify-center gap-2"
            >
              {t("HOME.CTA_PRIMARY")}
            </a>
            <Link
              href="/docs/claude-code"
              className="h-12 px-10 bg-transparent border border-border text-foreground font-bold uppercase tracking-widest hover:border-foreground transition-all w-full sm:w-auto flex items-center justify-center gap-2 group"
            >
              {t("HOME.CTA_SECONDARY")}
              <LuChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
