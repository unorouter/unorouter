import { PostSections } from "@/components/pages/blog/post-sections";
import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

const P = "BLOG.POSTS.UNOROUTER_VS_RISUAI";

export async function UnorouterVsRisuaiContent() {
  const t = await getTranslations();

  return (
    <PostSections
      slug="unorouter-vs-risuai"
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
