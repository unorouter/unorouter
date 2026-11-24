import { PostSections } from "@/components/pages/blog/post-sections";
import { Link } from "@/i18n/navigation";
import { env } from "@/lib/config/env";
import type { ReactNode } from "react";

export function CustomProviderImagesVideosContent() {
  return (
    <PostSections
      slug="custom-provider-images-videos"
      chunks={{
        guide: (chunks: ReactNode) => (
          <Link
            href={{
              pathname: "/docs/chat/[slug]",
              params: { slug: "custom-providers" },
            }}
          >
            {chunks}
          </Link>
        ),
        discord: (chunks: ReactNode) =>
          env.discordUrl ? (
            <a href={env.discordUrl} rel="noopener noreferrer" target="_blank">
              {chunks}
            </a>
          ) : (
            <>{chunks}</>
          ),
      }}
    />
  );
}
