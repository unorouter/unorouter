import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export async function OwnPurposeNotice() {
  const t = await getTranslations();
  return (
    <div className="border-warning/40 bg-warning/10 mt-6 flex max-w-2xl items-start gap-3 rounded-lg border p-4 text-left">
      <Icon name="brain" className="text-warning mt-0.5 h-5 w-5 shrink-0" />
      <div className="text-sm">
        <p className="font-semibold">{t("MODEL_PAGE.OWN_PURPOSE_TITLE")}</p>
        <p className="text-foreground/70">{t("MODEL_PAGE.OWN_PURPOSE_BODY")}</p>
        <Link
          href="/privacy"
          className="text-foreground hover:text-warning mt-3 inline-flex items-center gap-1.5 font-medium"
        >
          {t("CONSENT.PRIVACY_LINK")}
        </Link>
      </div>
    </div>
  );
}
