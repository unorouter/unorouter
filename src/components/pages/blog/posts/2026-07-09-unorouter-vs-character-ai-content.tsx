import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

export async function UnorouterVsCharacterAiContent() {
  const t = await getTranslations();

  return (
    <>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_CHARACTER_AI.INTRO", APP_VALUES)}</p>

      <h2 id="walled">{t("BLOG.POSTS.UNOROUTER_VS_CHARACTER_AI.H_WALLED")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_CHARACTER_AI.P_WALLED", APP_VALUES)}</p>

      <h2 id="models">{t("BLOG.POSTS.UNOROUTER_VS_CHARACTER_AI.H_MODELS")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_CHARACTER_AI.P_MODELS", APP_VALUES)}</p>

      <h2 id="api">{t("BLOG.POSTS.UNOROUTER_VS_CHARACTER_AI.H_API")}</h2>
      <p>
        {t.rich("BLOG.POSTS.UNOROUTER_VS_CHARACTER_AI.P_API", {
          ...APP_VALUES,
          c: (chunks) => <code>{chunks}</code>,
        })}
      </p>

      <h2 id="privacy">{t("BLOG.POSTS.UNOROUTER_VS_CHARACTER_AI.H_PRIVACY")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_CHARACTER_AI.P_PRIVACY", APP_VALUES)}</p>

      <h2 id="verdict">{t("BLOG.POSTS.UNOROUTER_VS_CHARACTER_AI.H_VERDICT")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_CHARACTER_AI.P_VERDICT", APP_VALUES)}</p>

      <p>
        {t.rich("BLOG.POSTS.UNOROUTER_VS_CHARACTER_AI.CTA", {
          ...APP_VALUES,
          register: (chunks) => <Link href="/register">{chunks}</Link>,
          chat: (chunks) => <Link href="/chat">{chunks}</Link>,
        })}
      </p>
    </>
  );
}
