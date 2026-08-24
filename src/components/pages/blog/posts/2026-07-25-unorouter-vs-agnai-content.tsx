import { PostSections } from "@/components/pages/blog/post-sections";
import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

const P = "BLOG.POSTS.UNOROUTER_VS_AGNAI";

export async function UnorouterVsAgnaiContent() {
  const t = await getTranslations();

  return (
    <PostSections
      slug="unorouter-vs-agnai"
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
