"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useSessionHistoryQuery } from "@/hooks/ai/playground-hook";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

export function PlaygroundList() {
  const t = useTranslations();
  const sidebar = useSidebar();
  const pathname = usePathname();
  const query = useSessionHistoryQuery({ limit: 30 });

  const items = query.data?.items ?? [];
  const segments = pathname.split("/").filter(Boolean);
  const generateIdx = segments.findIndex((s) => s === "generate");
  const activeSessionId =
    generateIdx >= 0 && segments[generateIdx + 1]
      ? segments[generateIdx + 1]
      : undefined;

  if (sidebar.state === "collapsed") return null;

  return (
    <>
      <SidebarGroup className="shrink-0">
        <SidebarGroupContent>
          <Link
            href="/playground"
            className="border-input hover:bg-accent hover:text-accent-foreground inline-flex h-8 w-full items-center justify-start rounded-md border bg-transparent px-3 text-sm font-medium"
          >
            <Icon name="plus" className="mr-2 h-3.5 w-3.5" />
            {t("IMAGE.NEW_SESSION")}
          </Link>
        </SidebarGroupContent>
      </SidebarGroup>
      <SidebarGroup className="thin-scrollbar min-h-0 flex-1 overflow-y-auto">
        <SidebarGroupContent>
          {query.isLoading ? (
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground p-2 text-center text-xs">
              {t("IMAGE.HISTORY_EMPTY")}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {items.map((row) => {
                const session = row.session;
                const latest = row.latestSnapshot;
                const firstImage = row.latestImage;
                const snapshotCount = session.snapshotCount ?? 0;
                const extra = snapshotCount > 1 ? snapshotCount - 1 : 0;
                return (
                  <Link
                    key={session.id}
                    href={{
                      pathname: "/playground/[id]",
                      params: { id: session.id },
                    }}
                    title={latest?.prompt ?? session.title ?? ""}
                    className={cn(
                      "bg-muted relative block aspect-square overflow-hidden rounded",
                      "ring-offset-background hover:ring-ring hover:ring-1",
                      activeSessionId === session.id && "ring-ring ring-2",
                    )}
                  >
                    {firstImage?.r2Url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- R2
                      <img
                        src={firstImage.r2Url}
                        alt={latest?.prompt ?? session.title ?? ""}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-muted-foreground absolute inset-0 flex items-center justify-center text-[10px]">
                        {latest?.status === "failure"
                          ? "!"
                          : (latest?.progress ?? "?")}
                      </div>
                    )}
                    {extra > 0 && (
                      <span className="bg-background/80 text-foreground absolute right-1 bottom-1 rounded px-1 text-[10px] font-medium">
                        +{extra}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  );
}
