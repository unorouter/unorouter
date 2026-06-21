import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

export async function BestAiGatewayForSillytavernContent() {
  const t = await getTranslations();

  return (
    <>
      <p>{t("BLOG.POSTS.BEST_AI_GATEWAY_FOR_SILLYTAVERN.INTRO", APP_VALUES)}</p>

      <h2 id="what-matters">
        {t("BLOG.POSTS.BEST_AI_GATEWAY_FOR_SILLYTAVERN.H_WHAT_MATTERS")}
      </h2>
      <p>
        {t(
          "BLOG.POSTS.BEST_AI_GATEWAY_FOR_SILLYTAVERN.P_WHAT_MATTERS",
          APP_VALUES,
        )}
      </p>

      <h2 id="options">
        {t("BLOG.POSTS.BEST_AI_GATEWAY_FOR_SILLYTAVERN.H_OPTIONS")}
      </h2>
      <p>
        {t("BLOG.POSTS.BEST_AI_GATEWAY_FOR_SILLYTAVERN.P_OPTIONS", APP_VALUES)}
      </p>

      <h2 id="connect">
        {t("BLOG.POSTS.BEST_AI_GATEWAY_FOR_SILLYTAVERN.H_CONNECT")}
      </h2>
      <p>
        {t.rich("BLOG.POSTS.BEST_AI_GATEWAY_FOR_SILLYTAVERN.P_CONNECT", {
          ...APP_VALUES,
          c: (chunks) => <code>{chunks}</code>,
        })}
      </p>

      <h2 id="free">
        {t("BLOG.POSTS.BEST_AI_GATEWAY_FOR_SILLYTAVERN.H_FREE")}
      </h2>
      <p>
        {t("BLOG.POSTS.BEST_AI_GATEWAY_FOR_SILLYTAVERN.P_FREE", APP_VALUES)}
      </p>

      <h2 id="verdict">
        {t("BLOG.POSTS.BEST_AI_GATEWAY_FOR_SILLYTAVERN.H_VERDICT")}
      </h2>
      <p>
        {t("BLOG.POSTS.BEST_AI_GATEWAY_FOR_SILLYTAVERN.P_VERDICT", APP_VALUES)}
      </p>

      <p>
        {t.rich("BLOG.POSTS.BEST_AI_GATEWAY_FOR_SILLYTAVERN.CTA", {
          ...APP_VALUES,
          register: (chunks) => <Link href="/register">{chunks}</Link>,
          models: (chunks) => <Link href="/models">{chunks}</Link>,
        })}
      </p>
    </>
  );
}
