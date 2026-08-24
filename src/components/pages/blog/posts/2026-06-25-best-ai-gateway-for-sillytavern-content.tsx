import { PostSections } from "@/components/pages/blog/post-sections";
import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

const P = "BLOG.POSTS.BEST_AI_GATEWAY_FOR_SILLYTAVERN";

export async function BestAiGatewayForSillytavernContent() {
  const t = await getTranslations();

  return (
    <PostSections
      slug="best-ai-gateway-for-sillytavern"
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
