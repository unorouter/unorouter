import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

export async function UnorouterVsOpenrouterContent() {
  const t = await getTranslations();

  return (
    <>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_OPENROUTER.INTRO", APP_VALUES)}</p>

      <h2 id="lanes">{t("BLOG.POSTS.UNOROUTER_VS_OPENROUTER.H_LANES")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_OPENROUTER.P_LANES", APP_VALUES)}</p>

      <h2 id="models">{t("BLOG.POSTS.UNOROUTER_VS_OPENROUTER.H_MODELS")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_OPENROUTER.P_MODELS", APP_VALUES)}</p>

      <h2 id="rp">{t("BLOG.POSTS.UNOROUTER_VS_OPENROUTER.H_RP")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_OPENROUTER.P_RP", APP_VALUES)}</p>

      <h2 id="migrate">{t("BLOG.POSTS.UNOROUTER_VS_OPENROUTER.H_MIGRATE")}</h2>
      <p>
        {t.rich("BLOG.POSTS.UNOROUTER_VS_OPENROUTER.P_MIGRATE", {
          ...APP_VALUES,
          c: (chunks) => <code>{chunks}</code>,
        })}
      </p>

      <h2 id="verdict">{t("BLOG.POSTS.UNOROUTER_VS_OPENROUTER.H_VERDICT")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_OPENROUTER.P_VERDICT", APP_VALUES)}</p>

      <p>
        {t.rich("BLOG.POSTS.UNOROUTER_VS_OPENROUTER.CTA", {
          ...APP_VALUES,
          register: (chunks) => <Link href="/register">{chunks}</Link>,
          models: (chunks) => <Link href="/models">{chunks}</Link>,
        })}
      </p>
    </>
  );
}
