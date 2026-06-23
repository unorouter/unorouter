import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

export async function OneApiKeyForClaudeCodeAndRoleplayContent() {
  const t = await getTranslations();

  return (
    <>
      <p>
        {t(
          "BLOG.POSTS.ONE_API_KEY_FOR_CLAUDE_CODE_AND_ROLEPLAY.INTRO",
          APP_VALUES,
        )}
      </p>

      <h2 id="two-worlds">
        {t("BLOG.POSTS.ONE_API_KEY_FOR_CLAUDE_CODE_AND_ROLEPLAY.H_TWO_WORLDS")}
      </h2>
      <p>
        {t(
          "BLOG.POSTS.ONE_API_KEY_FOR_CLAUDE_CODE_AND_ROLEPLAY.P_TWO_WORLDS",
          APP_VALUES,
        )}
      </p>

      <h2 id="claude-code">
        {t("BLOG.POSTS.ONE_API_KEY_FOR_CLAUDE_CODE_AND_ROLEPLAY.H_CLAUDE_CODE")}
      </h2>
      <p>
        {t.rich(
          "BLOG.POSTS.ONE_API_KEY_FOR_CLAUDE_CODE_AND_ROLEPLAY.P_CLAUDE_CODE",
          {
            ...APP_VALUES,
            c: (chunks) => <code>{chunks}</code>,
          },
        )}
      </p>

      <h2 id="roleplay">
        {t("BLOG.POSTS.ONE_API_KEY_FOR_CLAUDE_CODE_AND_ROLEPLAY.H_ROLEPLAY")}
      </h2>
      <p>
        {t.rich(
          "BLOG.POSTS.ONE_API_KEY_FOR_CLAUDE_CODE_AND_ROLEPLAY.P_ROLEPLAY",
          {
            ...APP_VALUES,
            c: (chunks) => <code>{chunks}</code>,
          },
        )}
      </p>

      <h2 id="one-balance">
        {t("BLOG.POSTS.ONE_API_KEY_FOR_CLAUDE_CODE_AND_ROLEPLAY.H_ONE_BALANCE")}
      </h2>
      <p>
        {t(
          "BLOG.POSTS.ONE_API_KEY_FOR_CLAUDE_CODE_AND_ROLEPLAY.P_ONE_BALANCE",
          APP_VALUES,
        )}
      </p>

      <h2 id="verdict">
        {t("BLOG.POSTS.ONE_API_KEY_FOR_CLAUDE_CODE_AND_ROLEPLAY.H_VERDICT")}
      </h2>
      <p>
        {t(
          "BLOG.POSTS.ONE_API_KEY_FOR_CLAUDE_CODE_AND_ROLEPLAY.P_VERDICT",
          APP_VALUES,
        )}
      </p>

      <p>
        {t.rich("BLOG.POSTS.ONE_API_KEY_FOR_CLAUDE_CODE_AND_ROLEPLAY.CTA", {
          ...APP_VALUES,
          register: (chunks) => <Link href="/register">{chunks}</Link>,
          models: (chunks) => <Link href="/models">{chunks}</Link>,
        })}
      </p>
    </>
  );
}
