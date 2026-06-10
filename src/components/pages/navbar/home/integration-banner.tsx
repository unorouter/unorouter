import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";
import {
  CATEGORY_ORDER,
  type SetupCategory,
} from "@/components/pages/docs/setup-guides";
import { APP_VALUES, type TranslationKey } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

/** One card per setup-guide category. Cards point at the docs category anchor. */
type CategoryCard = {
  category: SetupCategory;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  accent: string;
  glow: string;
  border: string;
  ring: string;
};

const CATEGORY_CARDS: Record<SetupCategory, Omit<CategoryCard, "category">> = {
  coding: {
    titleKey: "DOCS_INDEX.PATH_CODING_TITLE",
    descKey: "DOCS_INDEX.PATH_CODING_DESC",
    accent: "text-emerald-700 dark:text-emerald-400",
    glow: "bg-emerald-600/20",
    border: "border-emerald-600/20 hover:border-emerald-600/50",
    ring: "border-emerald-600/30 group-hover:bg-emerald-600 group-hover:border-emerald-600",
  },
  roleplay: {
    titleKey: "DOCS_INDEX.PATH_ROLEPLAY_TITLE",
    descKey: "DOCS_INDEX.PATH_ROLEPLAY_DESC",
    accent: "text-fuchsia-700 dark:text-fuchsia-400",
    glow: "bg-fuchsia-600/20",
    border: "border-fuchsia-600/20 hover:border-fuchsia-600/50",
    ring: "border-fuchsia-600/30 group-hover:bg-fuchsia-600 group-hover:border-fuchsia-600",
  },
  general: {
    titleKey: "DOCS_INDEX.PATH_GENERAL_TITLE",
    descKey: "DOCS_INDEX.PATH_GENERAL_DESC",
    accent: "text-blue-700 dark:text-blue-400",
    glow: "bg-blue-600/20",
    border: "border-blue-600/20 hover:border-blue-600/50",
    ring: "border-blue-600/30 group-hover:bg-blue-600 group-hover:border-blue-600",
  },
  cli: {
    titleKey: "DOCS_INDEX.PATH_CLI_TITLE",
    descKey: "DOCS_INDEX.PATH_CLI_DESC",
    accent: "text-orange-700 dark:text-orange-400",
    glow: "bg-orange-600/20",
    border: "border-orange-600/20 hover:border-orange-600/50",
    ring: "border-orange-600/30 group-hover:bg-orange-600 group-hover:border-orange-600",
  },
};

const CATEGORY_ICON: Record<SetupCategory, string> = {
  coding: "code",
  roleplay: "drama",
  general: "message-circle",
  cli: "terminal",
};

/**
 * "Pick the client you are actually using" - category cards (free-ai style)
 * instead of one card per tool. Each card links to its docs category section.
 * Shared by the homepage and the pricing page.
 */
export async function IntegrationBanner() {
  const t = await getTranslations();

  return (
    <section className="border-border/50 relative border-t border-b py-12">
      <div className="mx-auto max-w-360 px-6">
        <div className="mb-8 text-center">
          <span className="text-muted-foreground font-mono text-[10px] tracking-[0.3em] uppercase">
            {t("DOCS_INDEX.PATHS_TITLE")}
          </span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
            {t("HOME.INTEGRATION.PICK_TITLE", APP_VALUES)}
          </h2>
          <p className="text-muted-foreground mx-auto mt-2 max-w-2xl text-sm">
            {t("HOME.INTEGRATION.PICK_DESC", APP_VALUES)}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {CATEGORY_ORDER.map((category) => {
            const card = CATEGORY_CARDS[category];
            return (
              <Link
                key={category}
                href={{ pathname: "/docs", hash: `category-${category}` }}
                className={`group flex flex-col gap-3 rounded-lg border px-6 py-5 ${card.border} bg-card/40 backdrop-blur-sm transition-all duration-300`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div
                      className={`absolute inset-0 ${card.glow} rounded-full blur-xl`}
                    />
                    <Icon
                      name={CATEGORY_ICON[category]}
                      className={`relative h-7 w-7 ${card.accent}`}
                    />
                  </div>
                  <h3
                    className={`text-base leading-tight font-bold tracking-tight md:text-lg ${card.accent}`}
                  >
                    {t(card.titleKey, APP_VALUES)}
                  </h3>
                </div>
                <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                  {t(card.descKey, APP_VALUES)}
                </p>
                <div className="mt-auto flex items-center gap-2 pt-2">
                  <span className="text-foreground/70 group-hover:text-foreground font-mono text-sm transition-colors">
                    {t("HOME.INTEGRATION.VIEW_GUIDE")}
                  </span>
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full border ${card.ring} transition-all`}
                  >
                    <Icon
                      name="arrow-right"
                      className={`h-3.5 w-3.5 ${card.accent} transition-colors group-hover:text-white`}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
