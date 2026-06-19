import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

export async function UnorouterVsLitellmContent() {
  const t = await getTranslations();

  return (
    <>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_LITELLM.INTRO", APP_VALUES)}</p>

      <h2 id="hosted">{t("BLOG.POSTS.UNOROUTER_VS_LITELLM.H_HOSTED")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_LITELLM.P_HOSTED", APP_VALUES)}</p>

      <h2 id="setup">{t("BLOG.POSTS.UNOROUTER_VS_LITELLM.H_SETUP")}</h2>
      <p>
        {t.rich("BLOG.POSTS.UNOROUTER_VS_LITELLM.P_SETUP", {
          ...APP_VALUES,
          c: (chunks) => <code>{chunks}</code>,
        })}
      </p>

      <h2 id="interface">{t("BLOG.POSTS.UNOROUTER_VS_LITELLM.H_INTERFACE")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_LITELLM.P_INTERFACE", APP_VALUES)}</p>

      <h2 id="cost">{t("BLOG.POSTS.UNOROUTER_VS_LITELLM.H_COST")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_LITELLM.P_COST", APP_VALUES)}</p>

      <h2 id="verdict">{t("BLOG.POSTS.UNOROUTER_VS_LITELLM.H_VERDICT")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_LITELLM.P_VERDICT", APP_VALUES)}</p>

      <p>
        {t.rich("BLOG.POSTS.UNOROUTER_VS_LITELLM.CTA", {
          ...APP_VALUES,
          register: (chunks) => <Link href="/register">{chunks}</Link>,
          models: (chunks) => <Link href="/models">{chunks}</Link>,
        })}
      </p>
    </>
  );
}
