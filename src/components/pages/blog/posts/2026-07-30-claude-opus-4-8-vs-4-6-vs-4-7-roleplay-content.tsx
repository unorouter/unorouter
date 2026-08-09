import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

export async function ClaudeOpus48Vs46Vs47RoleplayContent() {
  const t = await getTranslations();

  return (
    <>
      <p>
        {t(
          "BLOG.POSTS.CLAUDE_OPUS_4_8_VS_4_6_VS_4_7_ROLEPLAY.INTRO",
          APP_VALUES,
        )}
      </p>

      <h2 id="ranking">
        {t("BLOG.POSTS.CLAUDE_OPUS_4_8_VS_4_6_VS_4_7_ROLEPLAY.H_RANKING")}
      </h2>
      <p>
        {t(
          "BLOG.POSTS.CLAUDE_OPUS_4_8_VS_4_6_VS_4_7_ROLEPLAY.P_RANKING",
          APP_VALUES,
        )}
      </p>

      <h2 id="memory">
        {t("BLOG.POSTS.CLAUDE_OPUS_4_8_VS_4_6_VS_4_7_ROLEPLAY.H_MEMORY")}
      </h2>
      <p>
        {t(
          "BLOG.POSTS.CLAUDE_OPUS_4_8_VS_4_6_VS_4_7_ROLEPLAY.P_MEMORY",
          APP_VALUES,
        )}
      </p>

      <h2 id="emotional">
        {t("BLOG.POSTS.CLAUDE_OPUS_4_8_VS_4_6_VS_4_7_ROLEPLAY.H_EMOTIONAL")}
      </h2>
      <p>
        {t(
          "BLOG.POSTS.CLAUDE_OPUS_4_8_VS_4_6_VS_4_7_ROLEPLAY.P_EMOTIONAL",
          APP_VALUES,
        )}
      </p>

      <h2 id="creative">
        {t("BLOG.POSTS.CLAUDE_OPUS_4_8_VS_4_6_VS_4_7_ROLEPLAY.H_CREATIVE")}
      </h2>
      <p>
        {t(
          "BLOG.POSTS.CLAUDE_OPUS_4_8_VS_4_6_VS_4_7_ROLEPLAY.P_CREATIVE",
          APP_VALUES,
        )}
      </p>

      <h2 id="verdict">
        {t("BLOG.POSTS.CLAUDE_OPUS_4_8_VS_4_6_VS_4_7_ROLEPLAY.H_VERDICT")}
      </h2>
      <p>
        {t(
          "BLOG.POSTS.CLAUDE_OPUS_4_8_VS_4_6_VS_4_7_ROLEPLAY.P_VERDICT",
          APP_VALUES,
        )}
      </p>

      <p>
        {t.rich("BLOG.POSTS.CLAUDE_OPUS_4_8_VS_4_6_VS_4_7_ROLEPLAY.CTA", {
          ...APP_VALUES,
          register: (chunks) => <Link href="/register">{chunks}</Link>,
          chat: (chunks) => <Link href="/chat">{chunks}</Link>,
        })}
      </p>
    </>
  );
}
