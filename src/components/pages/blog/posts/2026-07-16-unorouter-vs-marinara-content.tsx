import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

export async function UnorouterVsMarinaraContent() {
  const t = await getTranslations();

  return (
    <>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_MARINARA.INTRO", APP_VALUES)}</p>

      <h2 id="engine">{t("BLOG.POSTS.UNOROUTER_VS_MARINARA.H_ENGINE")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_MARINARA.P_ENGINE", APP_VALUES)}</p>

      <h2 id="two-in-one">
        {t("BLOG.POSTS.UNOROUTER_VS_MARINARA.H_TWO_IN_ONE")}
      </h2>
      <p>
        {t.rich("BLOG.POSTS.UNOROUTER_VS_MARINARA.P_TWO_IN_ONE", {
          ...APP_VALUES,
          c: (chunks) => <code>{chunks}</code>,
        })}
      </p>

      <h2 id="hosting">{t("BLOG.POSTS.UNOROUTER_VS_MARINARA.H_HOSTING")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_MARINARA.P_HOSTING", APP_VALUES)}</p>

      <h2 id="wins">{t("BLOG.POSTS.UNOROUTER_VS_MARINARA.H_WINS")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_MARINARA.P_WINS", APP_VALUES)}</p>

      <h2 id="verdict">{t("BLOG.POSTS.UNOROUTER_VS_MARINARA.H_VERDICT")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_MARINARA.P_VERDICT", APP_VALUES)}</p>

      <p>
        {t.rich("BLOG.POSTS.UNOROUTER_VS_MARINARA.CTA", {
          ...APP_VALUES,
          register: (chunks) => <Link href="/register">{chunks}</Link>,
          chat: (chunks) => <Link href="/chat">{chunks}</Link>,
        })}
      </p>
    </>
  );
}
