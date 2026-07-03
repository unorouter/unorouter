import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

export async function UnorouterVsChubContent() {
  const t = await getTranslations();

  return (
    <>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_CHUB.INTRO", APP_VALUES)}</p>

      <h2 id="cards">{t("BLOG.POSTS.UNOROUTER_VS_CHUB.H_CARDS")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_CHUB.P_CARDS", APP_VALUES)}</p>

      <h2 id="models">{t("BLOG.POSTS.UNOROUTER_VS_CHUB.H_MODELS")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_CHUB.P_MODELS", APP_VALUES)}</p>

      <h2 id="one-key">{t("BLOG.POSTS.UNOROUTER_VS_CHUB.H_ONE_KEY")}</h2>
      <p>
        {t.rich("BLOG.POSTS.UNOROUTER_VS_CHUB.P_ONE_KEY", {
          ...APP_VALUES,
          c: (chunks) => <code>{chunks}</code>,
        })}
      </p>

      <h2 id="cost">{t("BLOG.POSTS.UNOROUTER_VS_CHUB.H_COST")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_CHUB.P_COST", APP_VALUES)}</p>

      <h2 id="verdict">{t("BLOG.POSTS.UNOROUTER_VS_CHUB.H_VERDICT")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_CHUB.P_VERDICT", APP_VALUES)}</p>

      <p>
        {t.rich("BLOG.POSTS.UNOROUTER_VS_CHUB.CTA", {
          ...APP_VALUES,
          register: (chunks) => <Link href="/register">{chunks}</Link>,
          chat: (chunks) => <Link href="/chat">{chunks}</Link>,
        })}
      </p>
    </>
  );
}
