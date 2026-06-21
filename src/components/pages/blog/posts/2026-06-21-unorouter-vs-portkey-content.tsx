import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

export async function UnorouterVsPortkeyContent() {
  const t = await getTranslations();

  return (
    <>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_PORTKEY.INTRO", APP_VALUES)}</p>

      <h2 id="audience">{t("BLOG.POSTS.UNOROUTER_VS_PORTKEY.H_AUDIENCE")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_PORTKEY.P_AUDIENCE", APP_VALUES)}</p>

      <h2 id="setup">{t("BLOG.POSTS.UNOROUTER_VS_PORTKEY.H_SETUP")}</h2>
      <p>
        {t.rich("BLOG.POSTS.UNOROUTER_VS_PORTKEY.P_SETUP", {
          ...APP_VALUES,
          c: (chunks) => <code>{chunks}</code>,
        })}
      </p>

      <h2 id="interface">{t("BLOG.POSTS.UNOROUTER_VS_PORTKEY.H_INTERFACE")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_PORTKEY.P_INTERFACE", APP_VALUES)}</p>

      <h2 id="cost">{t("BLOG.POSTS.UNOROUTER_VS_PORTKEY.H_COST")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_PORTKEY.P_COST", APP_VALUES)}</p>

      <h2 id="verdict">{t("BLOG.POSTS.UNOROUTER_VS_PORTKEY.H_VERDICT")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_PORTKEY.P_VERDICT", APP_VALUES)}</p>

      <p>
        {t.rich("BLOG.POSTS.UNOROUTER_VS_PORTKEY.CTA", {
          ...APP_VALUES,
          register: (chunks) => <Link href="/register">{chunks}</Link>,
          models: (chunks) => <Link href="/models">{chunks}</Link>,
        })}
      </p>
    </>
  );
}
