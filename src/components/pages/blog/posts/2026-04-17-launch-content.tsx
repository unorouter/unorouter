import { CodeBlock } from "@/components/elements/code/code-block";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export async function LaunchContent() {
  const t = await getTranslations();

  return (
    <>
      <p>{t("BLOG.POSTS.LAUNCH.INTRO")}</p>

      <h2 id="what">{t("BLOG.POSTS.LAUNCH.H_WHAT")}</h2>
      <p>{t("BLOG.POSTS.LAUNCH.P_WHAT")}</p>

      <h2 id="start">{t("BLOG.POSTS.LAUNCH.H_START")}</h2>
      <p>{t("BLOG.POSTS.LAUNCH.P_START")}</p>

      <CodeBlock
        language="typescript"
        code={`import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.unorouter.ai/v1",
  apiKey: process.env.UNOROUTER_API_KEY,
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
      <p>{t("BLOG.POSTS.LAUNCH.P_NEXT")}</p>

      <p>
        {t.rich("BLOG.POSTS.LAUNCH.CTA", {
          register: (chunks) => <Link href="/register">{chunks}</Link>,
          models: (chunks) => <Link href="/models">{chunks}</Link>,
        })}
      </p>
    </>
  );
}
