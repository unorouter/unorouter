"use client";

import { useGenerationHistoryQuery } from "@/hooks/generation-hook";
import { activeGenerationIdAtom } from "@/store/generation-store";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

// Horizontal scrolling strip of the user's last ~10 generations, rendered
// under the result column. Matic's feedback: "i want to quickly be able
// to compare without going to an entirely diff page and then back." The
// sidebar GenerationList still exists for full history; this strip is the
// always-visible session-scoped view.
//
// Hides for anonymous users (no history) or an empty list.
export function RecentStrip() {
  const t = useTranslations();
  const router = useRouter();
  const [activeId, setActiveId] = useAtom(activeGenerationIdAtom);
  const query = useGenerationHistoryQuery({ limit: 10 });
  const items = query.data?.items ?? [];

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-xs">
        {t("IMAGE.RECENT_TITLE")}
      </p>
      <div className="thin-scrollbar flex gap-2 overflow-x-auto pb-1">
        {items.map((row) => {
          const images = (row as { images?: { r2Url: string }[] }).images ?? [];
          const first = images[0]?.r2Url;
          const extra = images.length > 1 ? images.length - 1 : 0;
          const isActive = activeId === row.id;
          return (
            <button
              key={row.id}
              type="button"
              title={row.prompt}
              onClick={() => {
                setActiveId(row.id);
                window.history.replaceState(
                  null,
                  "",
                  `/generate/${row.id}`,
                );
                router.refresh();
              }}
              className={
                "bg-muted ring-offset-background relative h-16 w-16 shrink-0 overflow-hidden rounded " +
                (isActive
                  ? "ring-ring ring-2"
                  : "hover:ring-ring hover:ring-1")
              }
            >
              {first ? (
                // eslint-disable-next-line @next/next/no-img-element -- R2 host varies
                <img
                  src={first}
                  alt={row.prompt}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="text-muted-foreground absolute inset-0 flex items-center justify-center text-[10px]">
                  {row.status === "failure" ? "!" : (row.progress ?? "?")}
                </div>
              )}
              {extra > 0 && (
                <span className="bg-background/80 text-foreground absolute right-1 bottom-1 rounded px-1 text-[10px] font-medium">
                  +{extra}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
