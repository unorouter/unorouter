"use client";

import { useStatusQuery } from "@/hooks/status-hook";
import { useTranslations } from "next-intl";
import { LuBell } from "react-icons/lu";

type Announcement = {
  title?: string;
  content?: string;
  publishDate?: string;
  tag?: string;
  tagColor?: string;
};

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return dateStr;
  }
}

export function AnnouncementsPanel() {
  const t = useTranslations();
  const statusQuery = useStatusQuery();
  const status = statusQuery.data as
    | { announcements?: Announcement[]; announcements_enabled?: boolean }
    | undefined;

  if (!status?.announcements_enabled) return null;

  const announcements = (status?.announcements ?? []) as Announcement[];

  return (
    <div className="border-border bg-card flex flex-col border">
      <div className="border-border flex items-center gap-2 border-b p-5">
        <LuBell className="text-muted-foreground h-4 w-4" />
        <span className="text-foreground font-mono text-sm font-medium">
          {t("DASHBOARD.SYSTEM_NOTICE")}
        </span>
        {announcements.length > 0 && (
          <span className="bg-foreground/10 text-muted-foreground ml-auto font-mono text-[10px] px-1.5 py-0.5">
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
            {announcements.map((item, i) => (
              <div key={i} className="p-4 transition-colors hover:bg-accent/50">
                <div className="flex items-center gap-2">
                  {item.tag && (
                    <span
                      className="font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5"
                      style={{
                        backgroundColor: item.tagColor
                          ? `${item.tagColor}20`
                          : "var(--muted)",
                        color: item.tagColor || "var(--muted-foreground)",
                      }}
                    >
                      {item.tag}
                    </span>
                  )}
                  <span className="text-muted-foreground ml-auto font-mono text-[10px]">
                    {formatDate(item.publishDate)}
                  </span>
                </div>
                {item.title && (
                  <p className="text-foreground mt-2 font-mono text-xs font-medium">
                    {item.title}
                  </p>
                )}
                {item.content && (
                  <p className="text-muted-foreground mt-1 font-mono text-[11px] leading-relaxed">
                    {item.content}
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
