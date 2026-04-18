import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

export async function LaunchContent() {
  const t = await getTranslations();

  return (
    <>
      <p>{t("BLOG.POSTS.LAUNCH.INTRO", APP_VALUES)}</p>

      <h2 id="uptime">{t("BLOG.POSTS.LAUNCH.H_UPTIME")}</h2>
      <p>{t("BLOG.POSTS.LAUNCH.P_UPTIME", APP_VALUES)}</p>

      <h2 id="authentic">{t("BLOG.POSTS.LAUNCH.H_AUTHENTIC")}</h2>
      <p>{t("BLOG.POSTS.LAUNCH.P_AUTHENTIC", APP_VALUES)}</p>

      <h2 id="harness">{t("BLOG.POSTS.LAUNCH.H_HARNESS")}</h2>
      <p>{t("BLOG.POSTS.LAUNCH.P_HARNESS", APP_VALUES)}</p>

      <h2 id="next">{t("BLOG.POSTS.LAUNCH.H_NEXT")}</h2>
      <p>{t("BLOG.POSTS.LAUNCH.P_NEXT", APP_VALUES)}</p>

      <p>
        {t.rich("BLOG.POSTS.LAUNCH.CTA", {
          ...APP_VALUES,
          register: (chunks) => <Link href="/register">{chunks}</Link>,
          models: (chunks) => <Link href="/models">{chunks}</Link>,
        })}
      </p>
    </>
  );
}
