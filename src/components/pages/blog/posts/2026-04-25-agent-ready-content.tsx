import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

const SCANNER_CHECKS =
  "robotsTxt,sitemap,linkHeaders,markdownNegotiation,robotsTxtAiRules,contentSignals,webBotAuth,apiCatalog,oauthDiscovery,oauthProtectedResource,mcpServerCard,a2aAgentCard,agentSkills,webMcp,x402,mpp,ucp,acp";
const SCANNER_URL = `https://isitagentready.com/${APP_VALUES.appDomain}?checks=${encodeURIComponent(SCANNER_CHECKS)}`;

export async function AgentReadyContent() {
  const t = await getTranslations();

  return (
    <>
      <p>{t("BLOG.POSTS.AGENT_READY.INTRO", APP_VALUES)}</p>

      <h2 id="score">{t("BLOG.POSTS.AGENT_READY.H_SCORE")}</h2>
      <p>{t("BLOG.POSTS.AGENT_READY.P_SCORE", APP_VALUES)}</p>

      <figure className="not-prose my-8">
        <div className="border-border relative mx-auto aspect-square w-full max-w-2xl overflow-hidden rounded-2xl border">
          <Image
            src="/images/agent-ready-score.png"
            alt={t("BLOG.POSTS.AGENT_READY.IMG_ALT", APP_VALUES)}
            width={1472}
            height={1486}
            sizes="(min-width: 768px) 672px, 100vw"
            className="object-contain"
          />
        </div>
        <figcaption className="text-muted-foreground mt-3 text-center text-xs">
          {t.rich("BLOG.POSTS.AGENT_READY.IMG_CAPTION", {
            ...APP_VALUES,
            scanner: (chunks) => (
              <a href={SCANNER_URL} target="_blank" rel="noopener noreferrer">
                {chunks}
              </a>
            ),
          })}
        </figcaption>
      </figure>

      <h2 id="what">{t("BLOG.POSTS.AGENT_READY.H_WHAT")}</h2>
      <p>{t("BLOG.POSTS.AGENT_READY.P_WHAT", APP_VALUES)}</p>

      <h2 id="categories">{t("BLOG.POSTS.AGENT_READY.H_CATEGORIES")}</h2>
      <p>{t("BLOG.POSTS.AGENT_READY.P_CATEGORIES", APP_VALUES)}</p>

      <h2 id="stubs">{t("BLOG.POSTS.AGENT_READY.H_STUBS")}</h2>
      <p>{t("BLOG.POSTS.AGENT_READY.P_STUBS", APP_VALUES)}</p>

      <h2 id="try">{t("BLOG.POSTS.AGENT_READY.H_TRY")}</h2>
      <p>{t("BLOG.POSTS.AGENT_READY.P_TRY", APP_VALUES)}</p>

      <p>
        {t.rich("BLOG.POSTS.AGENT_READY.CTA", {
          ...APP_VALUES,
          scanner: (chunks) => (
            <a href={SCANNER_URL} target="_blank" rel="noopener noreferrer">
              {chunks}
            </a>
          ),
          register: (chunks) => <Link href="/register">{chunks}</Link>,
        })}
      </p>
    </>
  );
}
