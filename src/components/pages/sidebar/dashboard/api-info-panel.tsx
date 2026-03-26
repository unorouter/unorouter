"use client";

import { useStatusQuery } from "@/hooks/status-hook";
import { copyToClipboard } from "@/lib/utils/base";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LuCheck, LuCode, LuCopy } from "react-icons/lu";

export function ApiInfoPanel() {
  const t = useTranslations();
  const statusQuery = useStatusQuery();
  const status = statusQuery.data;

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!status?.api_info_enabled) return null;

  const apiInfo = status?.api_info ?? [];

  function handleCopy(url: string | undefined, index: number) {
    if (!url) return;
    copyToClipboard(url).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  }

  return (
    <div className="border-border bg-card flex flex-col border">
      <div className="border-border flex items-center gap-2 border-b p-5">
        <LuCode className="text-muted-foreground h-4 w-4" />
        <span className="text-foreground font-mono text-sm font-medium">
          {t("DASHBOARD.API_INFORMATION")}
        </span>
      </div>

      <div className="flex-1">
        {apiInfo.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2">
            <LuCode className="text-muted-foreground h-8 w-8 opacity-20" />
            <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
              {t("DASHBOARD.NO_API_INFO")}
            </span>
          </div>
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
                    <button
                      onClick={() => handleCopy(entry.url, i)}
                      className="text-muted-foreground hover:text-foreground shrink-0 p-1 transition-colors"
                      title={t("DASHBOARD.COPY_URL")}
                    >
                      {copiedIndex === i ? (
                        <LuCheck className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <LuCopy className="h-3.5 w-3.5" />
                      )}
                    </button>
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
