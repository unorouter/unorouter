import { PostSections } from "@/components/pages/blog/post-sections";
import { env } from "@/lib/config/env";
import type { ReactNode } from "react";

const QRONOS_URL = "https://qronos.me/";
const QRONOS_DISCORD_URL = "https://discord.gg/uhgZ7D3GT";

export function QronosJoinsPartnersContent() {
  return (
    <PostSections
      slug="qronos-joins-partners"
      chunks={{
        qronos: (chunks: ReactNode) => (
          <a href={QRONOS_URL} rel="noopener" target="_blank">
            {chunks}
          </a>
        ),
        qronos_discord: (chunks: ReactNode) => (
          <a href={QRONOS_DISCORD_URL} rel="noopener" target="_blank">
            {chunks}
          </a>
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
