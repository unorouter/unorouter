import { PostSections } from "@/components/pages/blog/post-sections";
import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

const P = "BLOG.POSTS.ONE_API_KEY_FOR_CLAUDE_CODE_AND_ROLEPLAY";

export async function OneApiKeyForClaudeCodeAndRoleplayContent() {
  const t = await getTranslations();

  return (
    <PostSections
      slug="one-api-key-for-claude-code-and-roleplay"
      cta={
        <p>
          {t.rich(`${P}.CTA`, {
            ...APP_VALUES,
            register: (chunks) => <Link href="/register">{chunks}</Link>,
            models: (chunks) => <Link href="/models">{chunks}</Link>,
          })}
        </p>
      }
    />
  );
}
