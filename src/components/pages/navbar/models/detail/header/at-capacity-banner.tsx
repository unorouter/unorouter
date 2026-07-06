import { Icon } from "@/components/ui/icon";
import { env } from "@/lib/config/env";
import { getTranslations } from "next-intl/server";

export async function AtCapacityBanner() {
  const t = await getTranslations();
  return (
    <div className="border-warning/40 bg-warning/10 mt-6 flex max-w-2xl items-start gap-3 rounded-lg border p-4 text-left">
      <Icon name="clock" className="text-warning mt-0.5 h-5 w-5 shrink-0" />
      <div className="text-sm">
        <p className="font-semibold">{t("MODEL_PAGE.AT_CAPACITY_TITLE")}</p>
        <p className="text-foreground/70">{t("MODEL_PAGE.AT_CAPACITY_BODY")}</p>
        {env.discordUrl && (
          <a
            href={env.discordUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-warning mt-3 inline-flex items-center gap-1.5 font-medium"
          >
            <Icon name="brand-discord" className="h-4 w-4" />
            {t("MODEL_PAGE.OFFLINE_REQUEST_CTA")}
          </a>
        )}
      </div>
    </div>
  );
}
