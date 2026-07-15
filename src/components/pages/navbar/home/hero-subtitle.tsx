import { APP_VALUES } from "@/lib/config/constants";
import { useTranslations } from "next-intl";

export function HeroSubtitle(props: { modelCount: number }) {
  const t = useTranslations();

  return (
    // modelCount comes from `getCachedPricing` ("use cache", cacheLife
    // "minutes") under cacheComponents: the static shell bakes the build-time
    // count while the cache revalidates to a fresher one, so the prerendered
    // text and the client render legitimately differ. Suppress the resulting
    // hydration text mismatch (React #418) - the live client value wins.
    <p
      suppressHydrationWarning
      className="text-muted-foreground mx-auto max-w-lg font-mono text-base leading-relaxed font-light lg:mx-0"
    >
      {t("HOME.HERO.SUBTITLE", {
        modelCount: String(props.modelCount),
        ...APP_VALUES,
      })}
    </p>
  );
}
