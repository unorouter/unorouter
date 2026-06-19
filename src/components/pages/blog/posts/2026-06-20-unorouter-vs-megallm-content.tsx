import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

export async function UnorouterVsMegallmContent() {
  const t = await getTranslations();

  return (
    <>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_MEGALLM.INTRO", APP_VALUES)}</p>

      <h2 id="same-lane">{t("BLOG.POSTS.UNOROUTER_VS_MEGALLM.H_SAME_LANE")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_MEGALLM.P_SAME_LANE", APP_VALUES)}</p>

      <h2 id="models">{t("BLOG.POSTS.UNOROUTER_VS_MEGALLM.H_MODELS")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_MEGALLM.P_MODELS", APP_VALUES)}</p>

      <h2 id="chat">{t("BLOG.POSTS.UNOROUTER_VS_MEGALLM.H_CHAT")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_MEGALLM.P_CHAT", APP_VALUES)}</p>

      <h2 id="migrate">{t("BLOG.POSTS.UNOROUTER_VS_MEGALLM.H_MIGRATE")}</h2>
      <p>
        {t.rich("BLOG.POSTS.UNOROUTER_VS_MEGALLM.P_MIGRATE", {
          ...APP_VALUES,
          c: (chunks) => <code>{chunks}</code>,
        })}
      </p>

      <h2 id="verdict">{t("BLOG.POSTS.UNOROUTER_VS_MEGALLM.H_VERDICT")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_MEGALLM.P_VERDICT", APP_VALUES)}</p>

      <p>
        {t.rich("BLOG.POSTS.UNOROUTER_VS_MEGALLM.CTA", {
          ...APP_VALUES,
          register: (chunks) => <Link href="/register">{chunks}</Link>,
          models: (chunks) => <Link href="/models">{chunks}</Link>,
        })}
      </p>
    </>
  );
}
