import { Link } from "@/i18n/navigation";
import { LuArrowRight, LuTerminal } from "react-icons/lu";
import { getTranslations } from "next-intl/server";

export async function IntegrationBanner() {
  const t = await getTranslations();

  return (
    <section className="relative py-8 px-6 border-t border-b border-white/5 bg-linear-to-r from-orange-600/5 via-transparent to-orange-600/5">
      <div className="max-w-360 mx-auto">
        <Link
          href="/docs/claude-code"
          className="group flex flex-col md:flex-row items-center justify-between gap-6 py-4 px-6 md:px-10 rounded-lg border border-orange-600/20 bg-black/40 backdrop-blur-sm hover:border-orange-600/50 hover:bg-orange-600/5 transition-all duration-300"
        >
          <div className="flex items-center gap-6">
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-orange-600/20 blur-xl rounded-full" />
              <LuTerminal className="relative h-12 w-12 text-orange-500" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-orange-600/20 text-orange-500 rounded">
                  {t("HOME.INTEGRATION_BADGE")}
                </span>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
                {t("HOME.INTEGRATION_TITLE")}
              </h3>
              <p className="text-sm text-gray-400 font-mono mt-1">
                {t("HOME.INTEGRATION_DESCRIPTION")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-white/70 group-hover:text-white transition-colors">
              View Guide
            </span>
            <div className="w-10 h-10 rounded-full border border-orange-600/30 flex items-center justify-center group-hover:bg-orange-600 group-hover:border-orange-600 transition-all">
              <LuArrowRight className="h-4 w-4 text-orange-500 group-hover:text-white transition-colors" />
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
