import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

export async function HowToConnectUnorouterToNevikaContent() {
  const t = await getTranslations();

  return (
    <>
      <p>
        {t("BLOG.POSTS.HOW_TO_CONNECT_UNOROUTER_TO_NEVIKA.INTRO", APP_VALUES)}
      </p>

      <h2 id="what-is-nevika">
        {t("BLOG.POSTS.HOW_TO_CONNECT_UNOROUTER_TO_NEVIKA.H_WHAT_IS_NEVIKA")}
      </h2>
      <p>
        {t.rich("BLOG.POSTS.HOW_TO_CONNECT_UNOROUTER_TO_NEVIKA.P_WHAT_IS_NEVIKA", {
          ...APP_VALUES,
          nevika: (chunks) => (
            <a href="https://nevika.eu" rel="noopener" target="_blank">
              {chunks}
            </a>
          ),
        })}
      </p>

      <h2 id="what-you-need">
        {t("BLOG.POSTS.HOW_TO_CONNECT_UNOROUTER_TO_NEVIKA.H_WHAT_YOU_NEED")}
      </h2>
      <p>
        {t(
          "BLOG.POSTS.HOW_TO_CONNECT_UNOROUTER_TO_NEVIKA.P_WHAT_YOU_NEED",
          APP_VALUES,
        )}
      </p>

      <h2 id="steps">
        {t("BLOG.POSTS.HOW_TO_CONNECT_UNOROUTER_TO_NEVIKA.H_STEPS")}
      </h2>
      <p>
        {t.rich("BLOG.POSTS.HOW_TO_CONNECT_UNOROUTER_TO_NEVIKA.P_STEPS", {
          ...APP_VALUES,
          c: (chunks) => <code>{chunks}</code>,
          setup: (chunks) => (
            <a
              href="https://nevika.eu/tutorial/custom-proxy/unorouter"
              rel="noopener"
              target="_blank"
            >
              {chunks}
            </a>
          ),
        })}
      </p>

      <h2 id="picking-a-model">
        {t("BLOG.POSTS.HOW_TO_CONNECT_UNOROUTER_TO_NEVIKA.H_PICKING_A_MODEL")}
      </h2>
      <p>
        {t.rich(
          "BLOG.POSTS.HOW_TO_CONNECT_UNOROUTER_TO_NEVIKA.P_PICKING_A_MODEL",
          {
            ...APP_VALUES,
            c: (chunks) => <code>{chunks}</code>,
          },
        )}
      </p>

      <h2 id="troubleshooting">
        {t("BLOG.POSTS.HOW_TO_CONNECT_UNOROUTER_TO_NEVIKA.H_TROUBLESHOOTING")}
      </h2>
      <p>
        {t.rich(
          "BLOG.POSTS.HOW_TO_CONNECT_UNOROUTER_TO_NEVIKA.P_TROUBLESHOOTING",
          {
            ...APP_VALUES,
            c: (chunks) => <code>{chunks}</code>,
          },
        )}
      </p>

      <h2 id="verdict">
        {t("BLOG.POSTS.HOW_TO_CONNECT_UNOROUTER_TO_NEVIKA.H_VERDICT")}
      </h2>
      <p>
        {t(
          "BLOG.POSTS.HOW_TO_CONNECT_UNOROUTER_TO_NEVIKA.P_VERDICT",
          APP_VALUES,
        )}
      </p>

      <p>
        {t.rich("BLOG.POSTS.HOW_TO_CONNECT_UNOROUTER_TO_NEVIKA.CTA", {
          ...APP_VALUES,
          register: (chunks) => <Link href="/register">{chunks}</Link>,
          models: (chunks) => <Link href="/models">{chunks}</Link>,
        })}
      </p>
    </>
  );
}
