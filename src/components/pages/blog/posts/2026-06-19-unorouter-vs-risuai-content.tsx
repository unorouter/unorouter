import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

export async function UnorouterVsRisuaiContent() {
  const t = await getTranslations();

  return (
    <>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_RISUAI.INTRO", APP_VALUES)}</p>

      <h2 id="engine">{t("BLOG.POSTS.UNOROUTER_VS_RISUAI.H_ENGINE")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_RISUAI.P_ENGINE", APP_VALUES)}</p>

      <h2 id="two-in-one">
        {t("BLOG.POSTS.UNOROUTER_VS_RISUAI.H_TWO_IN_ONE")}
      </h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_RISUAI.P_TWO_IN_ONE", APP_VALUES)}</p>

      <h2 id="hosting">{t("BLOG.POSTS.UNOROUTER_VS_RISUAI.H_HOSTING")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_RISUAI.P_HOSTING", APP_VALUES)}</p>

      <h2 id="risu-wins">{t("BLOG.POSTS.UNOROUTER_VS_RISUAI.H_RISU_WINS")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_RISUAI.P_RISU_WINS", APP_VALUES)}</p>

      <h2 id="verdict">{t("BLOG.POSTS.UNOROUTER_VS_RISUAI.H_VERDICT")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_RISUAI.P_VERDICT", APP_VALUES)}</p>

      <p>
        {t.rich("BLOG.POSTS.UNOROUTER_VS_RISUAI.CTA", {
          ...APP_VALUES,
          register: (chunks) => <Link href="/register">{chunks}</Link>,
          chat: (chunks) => <Link href="/chat">{chunks}</Link>,
        })}
      </p>
    </>
  );
}
