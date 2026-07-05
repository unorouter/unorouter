import { Icon } from "@/components/ui/icon";
import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";

// Shown when a model is in the durable catalog but currently absent from live
// pricing: every upstream provider is rate-limited. Mirrors the API's 503
// semantics; the page stays 200 so crawlers keep the URL through churn.
export async function AtCapacityBanner(props: { locale: Locale }) {
  const t = await getTranslations({ locale: props.locale });
  return (
    <div className="border-warning/40 bg-warning/10 mx-auto mt-4 flex max-w-4xl items-start gap-3 rounded-lg border p-4">
      <Icon name="clock" className="text-warning mt-0.5 h-5 w-5 shrink-0" />
      <div className="text-sm">
        <p className="font-semibold">{t("MODEL_PAGE.AT_CAPACITY_TITLE")}</p>
        <p className="text-foreground/70">{t("MODEL_PAGE.AT_CAPACITY_BODY")}</p>
      </div>
    </div>
  );
}
