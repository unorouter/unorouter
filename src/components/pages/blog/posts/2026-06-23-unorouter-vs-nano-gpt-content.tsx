import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

export async function UnorouterVsNanoGptContent() {
  const t = await getTranslations();

  return (
    <>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_NANO_GPT.INTRO", APP_VALUES)}</p>

      <h2 id="catalog">{t("BLOG.POSTS.UNOROUTER_VS_NANO_GPT.H_CATALOG")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_NANO_GPT.P_CATALOG", APP_VALUES)}</p>

      <h2 id="dev">{t("BLOG.POSTS.UNOROUTER_VS_NANO_GPT.H_DEV")}</h2>
      <p>
        {t.rich("BLOG.POSTS.UNOROUTER_VS_NANO_GPT.P_DEV", {
          ...APP_VALUES,
          c: (chunks) => <code>{chunks}</code>,
        })}
      </p>

      <h2 id="chat">{t("BLOG.POSTS.UNOROUTER_VS_NANO_GPT.H_CHAT")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_NANO_GPT.P_CHAT", APP_VALUES)}</p>

      <h2 id="pay">{t("BLOG.POSTS.UNOROUTER_VS_NANO_GPT.H_PAY")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_NANO_GPT.P_PAY", APP_VALUES)}</p>

      <h2 id="verdict">{t("BLOG.POSTS.UNOROUTER_VS_NANO_GPT.H_VERDICT")}</h2>
      <p>{t("BLOG.POSTS.UNOROUTER_VS_NANO_GPT.P_VERDICT", APP_VALUES)}</p>

      <p>
        {t.rich("BLOG.POSTS.UNOROUTER_VS_NANO_GPT.CTA", {
          ...APP_VALUES,
          register: (chunks) => <Link href="/register">{chunks}</Link>,
          models: (chunks) => <Link href="/models">{chunks}</Link>,
        })}
      </p>
    </>
  );
}
