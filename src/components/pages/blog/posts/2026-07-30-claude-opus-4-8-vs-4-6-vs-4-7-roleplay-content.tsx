import { PostSections } from "@/components/pages/blog/post-sections";
import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

const P = "BLOG.POSTS.CLAUDE_OPUS_4_8_VS_4_6_VS_4_7_ROLEPLAY";

export async function ClaudeOpus48Vs46Vs47RoleplayContent() {
  const t = await getTranslations();

  return (
    <PostSections
      slug="claude-opus-4-8-vs-4-6-vs-4-7-roleplay"
      cta={
        <p>
          {t.rich(`${P}.CTA`, {
            ...APP_VALUES,
            register: (chunks) => <Link href="/register">{chunks}</Link>,
            chat: (chunks) => <Link href="/chat">{chunks}</Link>,
          })}
        </p>
      }
    />
  );
}
