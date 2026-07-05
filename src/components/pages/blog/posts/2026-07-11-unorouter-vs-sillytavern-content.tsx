import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

export async function UnorouterVsSillytavernContent() {
  const t = await getTranslations();

  return (
    <>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_SILLYTAVERN.INTRO", APP_VALUES)}</p>

      <h2 id="hosted">{t("BLOG.POSTS.UNOROUTER_VS_SILLYTAVERN.H_HOSTED")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_SILLYTAVERN.P_HOSTED", APP_VALUES)}</p>

      <h2 id="depth">{t("BLOG.POSTS.UNOROUTER_VS_SILLYTAVERN.H_DEPTH")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_SILLYTAVERN.P_DEPTH", APP_VALUES)}</p>

      <h2 id="one-key">{t("BLOG.POSTS.UNOROUTER_VS_SILLYTAVERN.H_ONE_KEY")}</h2>
      <p>
        {t.rich("BLOG.POSTS.UNOROUTER_VS_SILLYTAVERN.P_ONE_KEY", {
          ...APP_VALUES,
          c: (chunks) => <code>{chunks}</code>,
        })}
      </p>

      <h2 id="drops-in">
        {t("BLOG.POSTS.UNOROUTER_VS_SILLYTAVERN.H_DROPS_IN")}
      </h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_SILLYTAVERN.P_DROPS_IN", APP_VALUES)}</p>

      <h2 id="verdict">{t("BLOG.POSTS.UNOROUTER_VS_SILLYTAVERN.H_VERDICT")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_SILLYTAVERN.P_VERDICT", APP_VALUES)}</p>

      <p>
        {t.rich("BLOG.POSTS.UNOROUTER_VS_SILLYTAVERN.CTA", {
          ...APP_VALUES,
          register: (chunks) => <Link href="/register">{chunks}</Link>,
          chat: (chunks) => <Link href="/chat">{chunks}</Link>,
        })}
      </p>
    </>
  );
}
