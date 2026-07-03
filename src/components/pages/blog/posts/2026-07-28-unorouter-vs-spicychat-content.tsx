import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

export async function UnorouterVsSpicychatContent() {
  const t = await getTranslations();

  return (
    <>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_SPICYCHAT.INTRO", APP_VALUES)}</p>

      <h2 id="ease">{t("BLOG.POSTS.UNOROUTER_VS_SPICYCHAT.H_EASE")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_SPICYCHAT.P_EASE", APP_VALUES)}</p>

      <h2 id="depth">{t("BLOG.POSTS.UNOROUTER_VS_SPICYCHAT.H_DEPTH")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_SPICYCHAT.P_DEPTH", APP_VALUES)}</p>

      <h2 id="models">{t("BLOG.POSTS.UNOROUTER_VS_SPICYCHAT.H_MODELS")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_SPICYCHAT.P_MODELS", APP_VALUES)}</p>

      <h2 id="one-key">{t("BLOG.POSTS.UNOROUTER_VS_SPICYCHAT.H_ONE_KEY")}</h2>
      <p>
        {t.rich("BLOG.POSTS.UNOROUTER_VS_SPICYCHAT.P_ONE_KEY", {
          ...APP_VALUES,
          c: (chunks) => <code>{chunks}</code>,
        })}
      </p>

      <h2 id="verdict">{t("BLOG.POSTS.UNOROUTER_VS_SPICYCHAT.H_VERDICT")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_SPICYCHAT.P_VERDICT", APP_VALUES)}</p>

      <p>
        {t.rich("BLOG.POSTS.UNOROUTER_VS_SPICYCHAT.CTA", {
          ...APP_VALUES,
          register: (chunks) => <Link href="/register">{chunks}</Link>,
          chat: (chunks) => <Link href="/chat">{chunks}</Link>,
        })}
      </p>
    </>
  );
}
