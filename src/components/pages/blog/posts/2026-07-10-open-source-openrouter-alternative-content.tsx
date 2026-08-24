import { PostSections } from "@/components/pages/blog/post-sections";
import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

const P = "BLOG.POSTS.OPEN_SOURCE_OPENROUTER_ALTERNATIVE";

export async function OpenSourceOpenrouterAlternativeContent() {
  const t = await getTranslations();

  return (
    <PostSections
      slug="open-source-openrouter-alternative"
      chunks={{
        gh: (chunks) => (
          <a
            href="https://github.com/unorouter"
            target="_blank"
            rel="noopener noreferrer"
          >
            {chunks}
          </a>
        ),
      }}
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
