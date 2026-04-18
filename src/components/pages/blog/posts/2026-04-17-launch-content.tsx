import { CodeBlock } from "@/components/elements/code/code-block";
import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { getTranslations } from "next-intl/server";

export async function LaunchContent() {
  const t = await getTranslations();

  return (
    <>
      <p>{t("BLOG.POSTS.LAUNCH.INTRO", APP_VALUES)}</p>

      <h2 id="what">{t("BLOG.POSTS.LAUNCH.H_WHAT")}</h2>
      <p>{t("BLOG.POSTS.LAUNCH.P_WHAT", APP_VALUES)}</p>

      <h2 id="start">{t("BLOG.POSTS.LAUNCH.H_START")}</h2>
      <p>{t("BLOG.POSTS.LAUNCH.P_START", APP_VALUES)}</p>

      <CodeBlock
        language="typescript"
        code={`import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${env.apiUrl}/v1",
  apiKey: process.env.${env.appName?.toUpperCase() ?? "APP"}_API_KEY,
});

const res = await client.chat.completions.create({
  model: "claude-sonnet-4-6",
  messages: [{ role: "user", content: "Hello!" }],
});`}
      />

      <h2 id="why">{t("BLOG.POSTS.LAUNCH.H_WHY")}</h2>
      <ul>
        <li>
          <strong>{t("BLOG.POSTS.LAUNCH.WHY_1_TITLE")}</strong>{" "}
          {t("BLOG.POSTS.LAUNCH.WHY_1_BODY")}
        </li>
        <li>
          <strong>{t("BLOG.POSTS.LAUNCH.WHY_2_TITLE")}</strong>{" "}
          {t("BLOG.POSTS.LAUNCH.WHY_2_BODY")}
        </li>
        <li>
          <strong>{t("BLOG.POSTS.LAUNCH.WHY_3_TITLE")}</strong>{" "}
          {t("BLOG.POSTS.LAUNCH.WHY_3_BODY")}
        </li>
      </ul>

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
