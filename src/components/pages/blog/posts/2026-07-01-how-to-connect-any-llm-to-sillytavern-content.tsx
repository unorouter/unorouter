import { PostSections } from "@/components/pages/blog/post-sections";
import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

const P = "BLOG.POSTS.HOW_TO_CONNECT_ANY_LLM_TO_SILLYTAVERN";

export async function HowToConnectAnyLlmToSillytavernContent() {
  const t = await getTranslations();

  return (
    <PostSections
      slug="how-to-connect-any-llm-to-sillytavern"
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
