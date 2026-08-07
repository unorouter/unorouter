"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useTokensQuery } from "@/hooks/billing/token-hook";
import { renderQuota } from "@/lib/config/constants";
import { formatRelativeUnix } from "@/lib/utils/format/date";
import { useLocale, useTranslations } from "next-intl";
import { PanelEmpty } from "./panel";
import { SectionCard } from "./section-card";

const TOP_KEYS = 6;

export function ApiKeysPanel() {
  const t = useTranslations();
  const locale = useLocale();
  const tokensQuery = useTokensQuery({ p: 1, page_size: 50 });

  const tokens = [...(tokensQuery.data?.items ?? [])]
    .sort((a, b) => (b.used_quota ?? 0) - (a.used_quota ?? 0))
    .slice(0, TOP_KEYS);

  return (
    <SectionCard
      title={t("DASHBOARD.PANEL.API_KEYS")}
      subtitle={t("DASHBOARD.PANEL.API_KEYS_DESC")}
      icon="key"
    >
      {tokensQuery.isLoading ? (
        <div className="p-5">
          <Skeleton className="h-32 w-full" />
        </div>
      ) : tokens.length === 0 ? (
        <PanelEmpty icon="key" label={t("DASHBOARD.NO_DATA")} />
      ) : (
        <div className="divide-border divide-y">
          {tokens.map((token) => (
            <div key={token.id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <span className="text-foreground block truncate font-mono text-xs">
                  {token.name || t("DASHBOARD.PANEL.UNNAMED_KEY")}
                </span>
                <span className="text-muted-foreground font-mono text-[10px]">
                  {token.accessed_time
                    ? t("DASHBOARD.PANEL.LAST_USED", {
                        when: formatRelativeUnix(token.accessed_time, locale),
                      })
                    : t("DASHBOARD.PANEL.NEVER_USED")}
                </span>
              </div>
              <span className="text-foreground shrink-0 font-mono text-xs tabular-nums">
                {renderQuota(token.used_quota)}
              </span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
