"use client";

import { CopyButton } from "@/components/elements/code/copy-button";
import { Icon } from "@/components/ui/icon";
import { useStatusQuery } from "@/hooks/ops/status-hook";
import { useTranslations } from "next-intl";
import { PanelEmpty } from "./panel";

export function ApiInfoPanel() {
  const t = useTranslations();
  const statusQuery = useStatusQuery();
  const status = statusQuery.data;

  if (!status?.api_info_enabled) return null;

  const apiInfo = status?.api_info ?? [];

  return (
    <div className="border-border bg-card flex flex-col border">
      <div className="border-border flex items-center gap-2 border-b p-5">
        <Icon name="code" className="text-muted-foreground h-4 w-4" />
        <span className="text-foreground font-mono text-sm font-medium">
          {t("DASHBOARD.PANEL.API_INFORMATION")}
        </span>
      </div>

      <div className="flex-1">
        {apiInfo.length === 0 ? (
          <PanelEmpty icon="code" label={t("DASHBOARD.PANEL.NO_API_INFO")} />
        ) : (
          <div className="divide-border divide-y">
            {apiInfo.map((entry, i) => (
              <div key={i} className="p-4">
                {entry.route && (
                  <span
                    className="block font-mono text-[10px] tracking-widest uppercase"
                    style={{ color: entry.color || "var(--muted-foreground)" }}
                  >
                    {entry.route}
                  </span>
                )}
                {entry.url && (
                  <div className="mt-2 flex items-center gap-2">
                    <code className="bg-muted text-foreground flex-1 overflow-hidden px-2 py-1 font-mono text-[11px] text-ellipsis">
                      {entry.url}
                    </code>
                    <CopyButton
                      text={entry.url}
                      className="text-muted-foreground hover:text-foreground shrink-0 p-1 transition-colors"
                      analyticsLabel="dashboard_api_url"
                    />
                  </div>
                )}
                {entry.description && (
                  <p className="text-muted-foreground mt-1 font-mono text-[10px]">
                    {entry.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
