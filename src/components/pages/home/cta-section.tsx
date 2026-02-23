import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function CtaSection() {
  const t = await getTranslations();

  return (
    <section className="relative py-32 px-6 border-t border-white/5">
      <div className="max-w-360 mx-auto text-center">
        <div className="space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tighter">
            {t("HOME.CTA_TITLE_1")}{" "}
            <span className="text-purple-400">{t("HOME.CTA_TITLE_2")}</span>?
          </h2>
          <p className="text-gray-400 font-mono text-sm max-w-xl mx-auto">
            {t("HOME.CTA_SUBTITLE")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 font-mono text-xs pt-4">
            <a
              href="https://api.unorouter.ai/register"
              className="h-12 px-10 bg-white text-black font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors w-full sm:w-auto flex items-center justify-center gap-2"
            >
              {t("HOME.CTA_PRIMARY")}
            </a>
            <Link
              href="/docs/claude-code"
              className="h-12 px-10 bg-transparent border border-white/20 text-white font-bold uppercase tracking-widest hover:border-white transition-all w-full sm:w-auto flex items-center justify-center gap-2 group"
            >
              {t("HOME.CTA_SECONDARY")}
              <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
