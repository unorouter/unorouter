import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

export async function UnorouterVsJanitoraiContent() {
  const t = await getTranslations();

  return (
    <>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_JANITORAI.INTRO", APP_VALUES)}</p>

      <h2 id="backend">{t("BLOG.POSTS.UNOROUTER_VS_JANITORAI.H_BACKEND")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_JANITORAI.P_BACKEND", APP_VALUES)}</p>

      <h2 id="proxy">{t("BLOG.POSTS.UNOROUTER_VS_JANITORAI.H_PROXY")}</h2>
      <p>
        {t.rich("BLOG.POSTS.UNOROUTER_VS_JANITORAI.P_PROXY", {
          ...APP_VALUES,
          c: (chunks) => <code>{chunks}</code>,
        })}
      </p>

      <h2 id="own-chat">{t("BLOG.POSTS.UNOROUTER_VS_JANITORAI.H_OWN_CHAT")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_JANITORAI.P_OWN_CHAT", APP_VALUES)}</p>

      <h2 id="migrate">{t("BLOG.POSTS.UNOROUTER_VS_JANITORAI.H_MIGRATE")}</h2>
      <p>
        {t.rich("BLOG.POSTS.UNOROUTER_VS_JANITORAI.P_MIGRATE", {
          ...APP_VALUES,
          c: (chunks) => <code>{chunks}</code>,
        })}
      </p>

      <h2 id="verdict">{t("BLOG.POSTS.UNOROUTER_VS_JANITORAI.H_VERDICT")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_JANITORAI.P_VERDICT", APP_VALUES)}</p>

      <p>
        {t.rich("BLOG.POSTS.UNOROUTER_VS_JANITORAI.CTA", {
          ...APP_VALUES,
          register: (chunks) => <Link href="/register">{chunks}</Link>,
          chat: (chunks) => <Link href="/chat">{chunks}</Link>,
        })}
      </p>
    </>
  );
}
