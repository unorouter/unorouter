import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

export async function UnorouterVsOpenWebuiContent() {
  const t = await getTranslations();

  return (
    <>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_OPEN_WEBUI.INTRO", APP_VALUES)}</p>

      <h2 id="hosted">{t("BLOG.POSTS.UNOROUTER_VS_OPEN_WEBUI.H_HOSTED")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_OPEN_WEBUI.P_HOSTED", APP_VALUES)}</p>

      <h2 id="models">{t("BLOG.POSTS.UNOROUTER_VS_OPEN_WEBUI.H_MODELS")}</h2>
      <p>
        {t.rich("BLOG.POSTS.UNOROUTER_VS_OPEN_WEBUI.P_MODELS", {
          ...APP_VALUES,
          c: (chunks) => <code>{chunks}</code>,
        })}
      </p>

      <h2 id="one-key">{t("BLOG.POSTS.UNOROUTER_VS_OPEN_WEBUI.H_ONE_KEY")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_OPEN_WEBUI.P_ONE_KEY", APP_VALUES)}</p>

      <h2 id="cost">{t("BLOG.POSTS.UNOROUTER_VS_OPEN_WEBUI.H_COST")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_OPEN_WEBUI.P_COST", APP_VALUES)}</p>

      <h2 id="verdict">{t("BLOG.POSTS.UNOROUTER_VS_OPEN_WEBUI.H_VERDICT")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_OPEN_WEBUI.P_VERDICT", APP_VALUES)}</p>

      <p>
        {t.rich("BLOG.POSTS.UNOROUTER_VS_OPEN_WEBUI.CTA", {
          ...APP_VALUES,
          register: (chunks) => <Link href="/register">{chunks}</Link>,
          models: (chunks) => <Link href="/models">{chunks}</Link>,
        })}
      </p>
    </>
  );
}
