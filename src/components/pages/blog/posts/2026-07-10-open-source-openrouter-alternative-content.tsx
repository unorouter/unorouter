import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

export async function OpenSourceOpenrouterAlternativeContent() {
  const t = await getTranslations();

  return (
    <>
      <p>{t("BLOG.POSTS.OPEN_SOURCE_OPENROUTER_ALTERNATIVE.INTRO", APP_VALUES)}</p>

      <h2 id="why-open">
        {t("BLOG.POSTS.OPEN_SOURCE_OPENROUTER_ALTERNATIVE.H_WHY")}
      </h2>
      <p>{t("BLOG.POSTS.OPEN_SOURCE_OPENROUTER_ALTERNATIVE.P_WHY", APP_VALUES)}</p>

      <h2 id="what-is-open">
        {t("BLOG.POSTS.OPEN_SOURCE_OPENROUTER_ALTERNATIVE.H_WHAT")}
      </h2>
      <p>
        {t.rich("BLOG.POSTS.OPEN_SOURCE_OPENROUTER_ALTERNATIVE.P_WHAT", {
          ...APP_VALUES,
          gh: (chunks) => (
            <a
              href="https://github.com/unorouter"
              target="_blank"
              rel="noopener noreferrer"
            >
              {chunks}
            </a>
          ),
        })}
      </p>

      <h2 id="compare">
        {t("BLOG.POSTS.OPEN_SOURCE_OPENROUTER_ALTERNATIVE.H_COMPARE")}
      </h2>
      <p>
        {t("BLOG.POSTS.OPEN_SOURCE_OPENROUTER_ALTERNATIVE.P_COMPARE", APP_VALUES)}
      </p>

      <h2 id="self-host">
        {t("BLOG.POSTS.OPEN_SOURCE_OPENROUTER_ALTERNATIVE.H_SELF_HOST")}
      </h2>
      <p>
        {t.rich("BLOG.POSTS.OPEN_SOURCE_OPENROUTER_ALTERNATIVE.P_SELF_HOST", {
          ...APP_VALUES,
          c: (chunks) => <code>{chunks}</code>,
        })}
      </p>

      <h2 id="verdict">
        {t("BLOG.POSTS.OPEN_SOURCE_OPENROUTER_ALTERNATIVE.H_VERDICT")}
      </h2>
      <p>
        {t("BLOG.POSTS.OPEN_SOURCE_OPENROUTER_ALTERNATIVE.P_VERDICT", APP_VALUES)}
      </p>

      <p>
        {t.rich("BLOG.POSTS.OPEN_SOURCE_OPENROUTER_ALTERNATIVE.CTA", {
          ...APP_VALUES,
          register: (chunks) => <Link href="/register">{chunks}</Link>,
          models: (chunks) => <Link href="/models">{chunks}</Link>,
        })}
      </p>
    </>
  );
}
