"use client";

import { useSessionHistoryQuery } from "@/hooks/generation-hook";
import {
  activeSessionIdAtom,
  activeSnapshotIdAtom,
} from "@/store/generation-store";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

// Vertical session list rendered under the result column. Replaces the
// old horizontal submit strip: now sessions are the unit of history,
// each session is a long-lived bucket of snapshots the user iterated
// on. Click selects the session; the page defaults to the newest
// snapshot inside.
//
// Hides for anonymous users (no history) or an empty list.
export function RecentStrip() {
  const t = useTranslations();
  const router = useRouter();
  const [activeSessionId, setActiveSessionId] = useAtom(activeSessionIdAtom);
  const [, setActiveSnapshotId] = useAtom(activeSnapshotIdAtom);
  const query = useSessionHistoryQuery({ limit: 10 });
  const items = query.data?.items ?? [];

  if (items.length === 0) return null;

  const fmtAgo = (when: Date | string | number | null | undefined) => {
    if (!when) return "";
    const ms = new Date(when).getTime();
    const diff = Date.now() - ms;
    const m = Math.floor(diff / 60_000);
    if (m < 1) return "0m";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    return `${d}d`;
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-xs">
        {t("IMAGE.RECENT_SESSIONS")}
      </p>
      <div className="thin-scrollbar flex max-h-96 flex-col gap-2 overflow-y-auto pr-1">
        {items.map((row) => {
          const session = row.session;
          const latest = row.latestSnapshot;
          const firstImage = row.latestImage;
          const isActive = activeSessionId === session.id;
          const snapshotCount = session.snapshotCount ?? 0;
          const imageCount = session.imageCount ?? 0;
          const prompt = latest?.prompt ?? session.title ?? "";
          return (
            <button
              key={session.id}
              type="button"
              title={prompt}
              onClick={() => {
                setActiveSessionId(session.id);
                setActiveSnapshotId(null);
                window.history.replaceState(
                  null,
                  "",
                  `/generate/${session.id}`,
                );
                router.refresh();
              }}
              className={
                "bg-muted ring-offset-background flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors " +
                (isActive
                  ? "ring-ring ring-2"
                  : "hover:ring-ring hover:ring-1")
              }
            >
              <div className="bg-background relative h-16 w-16 shrink-0 overflow-hidden rounded">
                {firstImage?.r2Url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- R2
                  <img
                    src={firstImage.r2Url}
                    alt={prompt}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-muted-foreground absolute inset-0 flex items-center justify-center text-[10px]">
                    {latest?.status === "failure"
                      ? "!"
                      : (latest?.progress ?? "?")}
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm">{prompt || "—"}</span>
                <span className="text-muted-foreground text-xs">
                  {session.firstModel ?? latest?.model ?? ""}
                  {snapshotCount > 0 && (
                    <>
                      {" · "}
                      {t("IMAGE.SNAPSHOT_COUNT", { count: snapshotCount })}
                    </>
                  )}
                  {imageCount > 0 && (
                    <>
                      {" · "}
                      {t("IMAGE.IMAGE_COUNT_TOTAL", { count: imageCount })}
                    </>
                  )}
                  {session.updatedAt && (
                    <>
                      {" · "}
                      {fmtAgo(session.updatedAt as never)}
                    </>
                  )}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
