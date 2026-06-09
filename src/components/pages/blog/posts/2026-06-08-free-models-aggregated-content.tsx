import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

export async function FreeModelsAggregatedContent() {
  const t = await getTranslations();

  return (
    <>
      <p>{t("BLOG.POSTS.FREE_MODELS_AGGREGATED.INTRO", APP_VALUES)}</p>

      <h2 id="what">{t("BLOG.POSTS.FREE_MODELS_AGGREGATED.H_WHAT")}</h2>
      <p>{t("BLOG.POSTS.FREE_MODELS_AGGREGATED.P_WHAT", APP_VALUES)}</p>

      <h2 id="caveat">{t("BLOG.POSTS.FREE_MODELS_AGGREGATED.H_CAVEAT")}</h2>
      <p>
        {t.rich("BLOG.POSTS.FREE_MODELS_AGGREGATED.P_CAVEAT", {
          ...APP_VALUES,
          c: (chunks) => <code>{chunks}</code>,
          s: (chunks) => <strong>{chunks}</strong>,
        })}
      </p>

      <h2 id="aggregate">
        {t("BLOG.POSTS.FREE_MODELS_AGGREGATED.H_AGGREGATE")}
      </h2>
      <p>{t("BLOG.POSTS.FREE_MODELS_AGGREGATED.P_AGGREGATE", APP_VALUES)}</p>

      <h2 id="failover">
        {t("BLOG.POSTS.FREE_MODELS_AGGREGATED.H_FAILOVER")}
      </h2>
      <p>
        {t.rich("BLOG.POSTS.FREE_MODELS_AGGREGATED.P_FAILOVER", {
          ...APP_VALUES,
          c: (chunks) => <code>{chunks}</code>,
        })}
      </p>

      <h2 id="honest">{t("BLOG.POSTS.FREE_MODELS_AGGREGATED.H_HONEST")}</h2>
      <p>{t("BLOG.POSTS.FREE_MODELS_AGGREGATED.P_HONEST", APP_VALUES)}</p>

      <h2 id="try">{t("BLOG.POSTS.FREE_MODELS_AGGREGATED.H_TRY")}</h2>
      <p>
        {t.rich("BLOG.POSTS.FREE_MODELS_AGGREGATED.CTA", {
          ...APP_VALUES,
          c: (chunks) => <code>{chunks}</code>,
          register: (chunks) => <Link href="/register">{chunks}</Link>,
          models: (chunks) => <Link href="/models">{chunks}</Link>,
        })}
      </p>
    </>
  );
}
