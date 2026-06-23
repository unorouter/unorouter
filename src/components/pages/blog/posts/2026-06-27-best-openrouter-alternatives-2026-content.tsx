import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

export async function BestOpenrouterAlternatives2026Content() {
  const t = await getTranslations();

  return (
    <>
      <p>
        {t("BLOG.POSTS.BEST_OPENROUTER_ALTERNATIVES_2026.INTRO", APP_VALUES)}
      </p>

      <h2 id="why-switch">
        {t("BLOG.POSTS.BEST_OPENROUTER_ALTERNATIVES_2026.H_WHY_SWITCH")}
      </h2>
      <p>
        {t(
          "BLOG.POSTS.BEST_OPENROUTER_ALTERNATIVES_2026.P_WHY_SWITCH",
          APP_VALUES,
        )}
      </p>

      <h2 id="what-to-compare">
        {t("BLOG.POSTS.BEST_OPENROUTER_ALTERNATIVES_2026.H_WHAT_TO_COMPARE")}
      </h2>
      <p>
        {t(
          "BLOG.POSTS.BEST_OPENROUTER_ALTERNATIVES_2026.P_WHAT_TO_COMPARE",
          APP_VALUES,
        )}
      </p>

      <h2 id="alternatives">
        {t("BLOG.POSTS.BEST_OPENROUTER_ALTERNATIVES_2026.H_ALTERNATIVES")}
      </h2>
      <p>
        {t.rich("BLOG.POSTS.BEST_OPENROUTER_ALTERNATIVES_2026.P_ALTERNATIVES", {
          ...APP_VALUES,
          c: (chunks) => <code>{chunks}</code>,
        })}
      </p>

      <h2 id="for-roleplay">
        {t("BLOG.POSTS.BEST_OPENROUTER_ALTERNATIVES_2026.H_FOR_ROLEPLAY")}
      </h2>
      <p>
        {t(
          "BLOG.POSTS.BEST_OPENROUTER_ALTERNATIVES_2026.P_FOR_ROLEPLAY",
          APP_VALUES,
        )}
      </p>

      <h2 id="verdict">
        {t("BLOG.POSTS.BEST_OPENROUTER_ALTERNATIVES_2026.H_VERDICT")}
      </h2>
      <p>
        {t(
          "BLOG.POSTS.BEST_OPENROUTER_ALTERNATIVES_2026.P_VERDICT",
          APP_VALUES,
        )}
      </p>

      <p>
        {t.rich("BLOG.POSTS.BEST_OPENROUTER_ALTERNATIVES_2026.CTA", {
          ...APP_VALUES,
          register: (chunks) => <Link href="/register">{chunks}</Link>,
          models: (chunks) => <Link href="/models">{chunks}</Link>,
        })}
      </p>
    </>
  );
}
