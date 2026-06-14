import { APP_VALUES } from "@/lib/config/constants";
import { useTranslations } from "next-intl";

    // Server component: count comes from the page's server-side pricing fetch so the full catalog never enters hydration.
export function HeroSubtitle(props: { modelCount: number }) {
  const t = useTranslations();

  return (
    <p className="text-muted-foreground mx-auto max-w-lg font-mono text-base leading-relaxed font-light lg:mx-0">
      {t("HOME.HERO.SUBTITLE", {
        modelCount: String(props.modelCount),
        ...APP_VALUES,
      })}
    </p>
  );
}
