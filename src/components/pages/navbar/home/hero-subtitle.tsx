import { APP_VALUES } from "@/lib/config/constants";
import { useTranslations } from "next-intl";

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
