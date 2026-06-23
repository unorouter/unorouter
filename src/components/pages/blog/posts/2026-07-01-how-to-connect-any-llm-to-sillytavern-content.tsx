import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

export async function HowToConnectAnyLlmToSillytavernContent() {
  const t = await getTranslations();

  return (
    <>
      <p>
        {t(
          "BLOG.POSTS.HOW_TO_CONNECT_ANY_LLM_TO_SILLYTAVERN.INTRO",
          APP_VALUES,
        )}
      </p>

      <h2 id="what-you-need">
        {t("BLOG.POSTS.HOW_TO_CONNECT_ANY_LLM_TO_SILLYTAVERN.H_WHAT_YOU_NEED")}
      </h2>
      <p>
        {t(
          "BLOG.POSTS.HOW_TO_CONNECT_ANY_LLM_TO_SILLYTAVERN.P_WHAT_YOU_NEED",
          APP_VALUES,
        )}
      </p>

      <h2 id="steps">
        {t("BLOG.POSTS.HOW_TO_CONNECT_ANY_LLM_TO_SILLYTAVERN.H_STEPS")}
      </h2>
      <p>
        {t.rich("BLOG.POSTS.HOW_TO_CONNECT_ANY_LLM_TO_SILLYTAVERN.P_STEPS", {
          ...APP_VALUES,
          c: (chunks) => <code>{chunks}</code>,
        })}
      </p>

      <h2 id="switching-models">
        {t(
          "BLOG.POSTS.HOW_TO_CONNECT_ANY_LLM_TO_SILLYTAVERN.H_SWITCHING_MODELS",
        )}
      </h2>
      <p>
        {t(
          "BLOG.POSTS.HOW_TO_CONNECT_ANY_LLM_TO_SILLYTAVERN.P_SWITCHING_MODELS",
          APP_VALUES,
        )}
      </p>

      <h2 id="troubleshooting">
        {t(
          "BLOG.POSTS.HOW_TO_CONNECT_ANY_LLM_TO_SILLYTAVERN.H_TROUBLESHOOTING",
        )}
      </h2>
      <p>
        {t.rich(
          "BLOG.POSTS.HOW_TO_CONNECT_ANY_LLM_TO_SILLYTAVERN.P_TROUBLESHOOTING",
          {
            ...APP_VALUES,
            c: (chunks) => <code>{chunks}</code>,
          },
        )}
      </p>

      <h2 id="verdict">
        {t("BLOG.POSTS.HOW_TO_CONNECT_ANY_LLM_TO_SILLYTAVERN.H_VERDICT")}
      </h2>
      <p>
        {t(
          "BLOG.POSTS.HOW_TO_CONNECT_ANY_LLM_TO_SILLYTAVERN.P_VERDICT",
          APP_VALUES,
        )}
      </p>

      <p>
        {t.rich("BLOG.POSTS.HOW_TO_CONNECT_ANY_LLM_TO_SILLYTAVERN.CTA", {
          ...APP_VALUES,
          register: (chunks) => <Link href="/register">{chunks}</Link>,
          models: (chunks) => <Link href="/models">{chunks}</Link>,
        })}
      </p>
    </>
  );
}
