import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

const NEVIKA_SETUP_URL = "https://nevika.eu/tutorial/custom-proxy/unorouter";

export async function HowToConnectUnorouterToNevikaContent() {
  const t = await getTranslations();

  return (
    <>
      <figure className="not-prose my-6 flex justify-center">
        <a href="https://nevika.eu" rel="noopener" target="_blank">
          <Image
            src="/icons/nevika.png"
            alt="Nevika"
            width={256}
            height={256}
            sizes="96px"
            className="size-24 object-contain"
          />
        </a>
      </figure>

      <p>
        {t.rich("BLOG.POSTS.HOW_TO_CONNECT_UNOROUTER_TO_NEVIKA.INTRO", {
          ...APP_VALUES,
          nevika: (chunks) => (
            <a href="https://nevika.eu" rel="noopener" target="_blank">
              {chunks}
            </a>
          ),
          setup: (chunks) => (
            <a href={NEVIKA_SETUP_URL} rel="noopener" target="_blank">
              {chunks}
            </a>
          ),
        })}
      </p>

      <h2 id="steps">
        {t("BLOG.POSTS.HOW_TO_CONNECT_UNOROUTER_TO_NEVIKA.H_STEPS")}
      </h2>
      <p>
        {t.rich("BLOG.POSTS.HOW_TO_CONNECT_UNOROUTER_TO_NEVIKA.P_STEPS", {
          ...APP_VALUES,
          c: (chunks) => <code>{chunks}</code>,
          setup: (chunks) => (
            <a href={NEVIKA_SETUP_URL} rel="noopener" target="_blank">
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
        {t("BLOG.POSTS.HOW_TO_CONNECT_UNOROUTER_TO_NEVIKA.P_TROUBLESHOOTING")}
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
