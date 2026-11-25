import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";
import type { GroupDataPolicy } from "@/openapi";
import { getTranslations } from "next-intl/server";

// Mirrors the gateway: only a provider recorded as using inputs just to answer
// ("none") stays routable once the user objects.
export async function OwnPurposeNotice(props: {
  groupProviders: Record<string, GroupDataPolicy>;
}) {
  const t = await getTranslations();
  const answerOnly = Object.values(props.groupProviders).filter(
    (p) => p.prompts === "none",
  ).length;
  return (
    <div className="border-warning/40 bg-warning/10 mt-6 flex max-w-2xl items-start gap-3 rounded-lg border p-4 text-left">
      <Icon name="brain" className="text-warning mt-0.5 h-5 w-5 shrink-0" />
      <div className="space-y-2 text-sm">
        <p className="font-semibold">{t("MODEL_PAGE.OWN_PURPOSE_TITLE")}</p>
        <p className="text-foreground/70">{t("MODEL_PAGE.OWN_PURPOSE_BODY")}</p>
        <p className="text-foreground/90">
          {answerOnly > 0
            ? t("MODEL_PAGE.OWN_PURPOSE_OBJECT_OK", { count: answerOnly })
            : t("MODEL_PAGE.OWN_PURPOSE_OBJECT_BLOCKED")}
        </p>
        <Link
          href="/privacy"
          className="text-foreground hover:text-warning inline-flex items-center gap-1.5 font-medium"
        >
          {t("CONSENT.PRIVACY_LINK")}
        </Link>
      </div>
    </div>
  );
}
