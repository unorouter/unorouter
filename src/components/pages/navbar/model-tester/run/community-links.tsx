"use client";

import { Icon } from "@/components/ui/icon";
import { useTranslations } from "next-intl";
import { TESTER_LINKS } from "../shared/links";

export function CommunityLinks(props: { githubHref?: string }) {
  const t = useTranslations();
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      <a
        href={props.githubHref ?? TESTER_LINKS.issuesNew}
        target="_blank"
        rel="noopener noreferrer"
        className="text-foreground inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
      >
        <Icon name="brand-github" className="size-3.5" />
        {t("MODEL_TESTER.RANKINGS.REPORT_GITHUB")}
      </a>
      <a
        href={TESTER_LINKS.discord}
        target="_blank"
        rel="noopener noreferrer"
        className="text-foreground inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
      >
        <Icon name="brand-discord" className="size-3.5" />
        {t("MODEL_TESTER.RANKINGS.REPORT_DISCORD")}
      </a>
    </span>
  );
}
