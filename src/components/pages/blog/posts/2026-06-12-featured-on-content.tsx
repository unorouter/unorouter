import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

const BADGES = [
  {
    href: "https://dang.ai",
    rel: "dofollow noopener",
    src: "https://assets.dang.ai/badges/dang-verified-dark.png",
    alt: "Verified on DANG!",
    width: 130,
    height: 54,
  },
  {
    href: "https://startupfa.me",
    rel: "noopener noreferrer",
    src: "https://startupfa.me/badges/featured-badge.webp",
    alt: "Featured on Startup Fame",
    width: 130,
    height: 54,
  },
  {
    href: "https://twelve.tools",
    rel: "noopener noreferrer",
    src: "https://twelve.tools/badge3-light.svg",
    alt: "Featured on Twelve Tools",
    width: 150,
    height: 54,
  },
  {
    href: "https://fazier.com",
    rel: "noopener noreferrer",
    src: "https://fazier.com/api/v1//public/badges/launch_badges.svg?badge_type=featured&theme=light",
    alt: "Featured on Fazier",
    width: 175,
    height: 54,
  },
  {
    href: "https://www.producthunt.com",
    rel: "noopener noreferrer",
    src: "https://api.producthunt.com/widgets/embed-image/v1/featured.svg?theme=light",
    alt: "Featured on Product Hunt",
    width: 190,
    height: 54,
  },
  {
    href: "https://code.market",
    rel: "noopener noreferrer",
    src: "https://code.market/assets/manage-product/featured-logo-bright.svg",
    alt: "Featured on code.market",
    width: 160,
    height: 54,
  },
  {
    href: "https://showmebest.ai",
    rel: "noopener noreferrer",
    src: "https://showmebest.ai/badge/feature-badge-white.webp",
    alt: "Featured on ShowMeBestAI",
    width: 154,
    height: 54,
  },
];

export async function FeaturedOnContent() {
  const t = await getTranslations();

  return (
    <>
      <p>{t("BLOG.POSTS.FEATURED_ON.INTRO", APP_VALUES)}</p>

      <h2 id="directories">{t("BLOG.POSTS.FEATURED_ON.H_DIRECTORIES")}</h2>
      <p>{t("BLOG.POSTS.FEATURED_ON.P_DIRECTORIES", APP_VALUES)}</p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        {BADGES.map((badge) => (
          <a key={badge.href} href={badge.href} target="_blank" rel={badge.rel}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={badge.src}
              alt={badge.alt}
              width={badge.width}
              height={badge.height}
              loading="lazy"
              decoding="async"
              style={{ height: "54px", width: "auto" }}
            />
          </a>
        ))}
      </div>

      <h2 id="why">{t("BLOG.POSTS.FEATURED_ON.H_WHY")}</h2>
      <p>{t("BLOG.POSTS.FEATURED_ON.P_WHY", APP_VALUES)}</p>

      <h2 id="verify">{t("BLOG.POSTS.FEATURED_ON.H_VERIFY")}</h2>
      <p>{t("BLOG.POSTS.FEATURED_ON.P_VERIFY", APP_VALUES)}</p>

      <h2 id="try">{t("BLOG.POSTS.FEATURED_ON.H_TRY")}</h2>
      <p>
        {t.rich("BLOG.POSTS.FEATURED_ON.CTA", {
          ...APP_VALUES,
          register: (chunks) => <Link href="/register">{chunks}</Link>,
          models: (chunks) => <Link href="/models">{chunks}</Link>,
        })}
      </p>
    </>
  );
}
