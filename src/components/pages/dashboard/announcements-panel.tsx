"use client";

import { useStatusQuery } from "@/hooks/status-hook";
import { useTranslations } from "next-intl";
import { LuBell } from "react-icons/lu";
import { formatDate } from "./stats";

const typeStyles: Record<string, string> = {
  success: "bg-green-500/10 text-green-500",
  warning: "bg-yellow-500/10 text-yellow-500",
  error: "bg-red-500/10 text-red-500",
  ongoing: "bg-blue-500/10 text-blue-500",
};

export function AnnouncementsPanel() {
  const t = useTranslations();
  const statusQuery = useStatusQuery();
  const status = statusQuery.data;

  if (!status?.announcements_enabled) return null;

  const announcements = status?.announcements ?? [];

  return (
    <div className="border-border bg-card flex flex-col border">
      <div className="border-border flex items-center gap-2 border-b p-5">
        <LuBell className="text-muted-foreground h-4 w-4" />
        <span className="text-foreground font-mono text-sm font-medium">
          {t("DASHBOARD.SYSTEM_NOTICE")}
        </span>
        {announcements.length > 0 && (
          <span className="bg-foreground/10 text-muted-foreground ml-auto px-1.5 py-0.5 font-mono text-[10px]">
            {announcements.length}
          </span>
        )}
      </div>

      <div className="max-h-64 flex-1 overflow-y-auto">
        {announcements.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2">
            <LuBell className="text-muted-foreground h-8 w-8 opacity-20" />
            <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
              {t("DASHBOARD.NO_ANNOUNCEMENTS")}
            </span>
          </div>
        ) : (
          <div className="divide-border divide-y">
            {announcements.map((item, i) => {
              const styles = typeStyles[item.type ?? ""] ?? "bg-muted text-muted-foreground";
              return (
                <div key={i} className="hover:bg-accent/50 p-4 transition-colors">
                  <div className="flex items-center gap-2">
                    {item.type && item.type !== "default" && (
                      <span
                        className={`px-1.5 py-0.5 font-mono text-[9px] tracking-widest uppercase ${styles}`}
                      >
                        {item.type}
                      </span>
                    )}
                    <span className="text-muted-foreground ml-auto font-mono text-[10px]">
                      {formatDate(item.publishDate)}
                    </span>
                  </div>
                  {item.content && (
                    <p className="text-foreground mt-2 font-mono text-xs font-medium">
                      {item.content}
                    </p>
                  )}
                  {item.extra && (
                    <p className="text-muted-foreground mt-1 font-mono text-[11px] leading-relaxed">
                      {item.extra}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
