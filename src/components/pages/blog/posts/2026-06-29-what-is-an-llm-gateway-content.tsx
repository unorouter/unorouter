import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

export async function WhatIsAnLlmGatewayContent() {
  const t = await getTranslations();

  return (
    <>
      <p>{t("BLOG.POSTS.WHAT_IS_AN_LLM_GATEWAY.INTRO", APP_VALUES)}</p>

      <h2 id="definition">
        {t("BLOG.POSTS.WHAT_IS_AN_LLM_GATEWAY.H_DEFINITION")}
      </h2>
      <p>
        {t.rich("BLOG.POSTS.WHAT_IS_AN_LLM_GATEWAY.P_DEFINITION", {
          ...APP_VALUES,
          c: (chunks) => <code>{chunks}</code>,
        })}
      </p>

      <h2 id="why-it-helps">
        {t("BLOG.POSTS.WHAT_IS_AN_LLM_GATEWAY.H_WHY_IT_HELPS")}
      </h2>
      <p>{t("BLOG.POSTS.WHAT_IS_AN_LLM_GATEWAY.P_WHY_IT_HELPS", APP_VALUES)}</p>

      <h2 id="how-it-works">
        {t("BLOG.POSTS.WHAT_IS_AN_LLM_GATEWAY.H_HOW_IT_WORKS")}
      </h2>
      <p>
        {t.rich("BLOG.POSTS.WHAT_IS_AN_LLM_GATEWAY.P_HOW_IT_WORKS", {
          ...APP_VALUES,
          c: (chunks) => <code>{chunks}</code>,
        })}
      </p>

      <h2 id="who-needs-one">
        {t("BLOG.POSTS.WHAT_IS_AN_LLM_GATEWAY.H_WHO_NEEDS_ONE")}
      </h2>
      <p>
        {t("BLOG.POSTS.WHAT_IS_AN_LLM_GATEWAY.P_WHO_NEEDS_ONE", APP_VALUES)}
      </p>

      <h2 id="verdict">{t("BLOG.POSTS.WHAT_IS_AN_LLM_GATEWAY.H_VERDICT")}</h2>
      <p>{t("BLOG.POSTS.WHAT_IS_AN_LLM_GATEWAY.P_VERDICT", APP_VALUES)}</p>

      <p>
        {t.rich("BLOG.POSTS.WHAT_IS_AN_LLM_GATEWAY.CTA", {
          ...APP_VALUES,
          register: (chunks) => <Link href="/register">{chunks}</Link>,
          models: (chunks) => <Link href="/models">{chunks}</Link>,
        })}
      </p>
    </>
  );
}
