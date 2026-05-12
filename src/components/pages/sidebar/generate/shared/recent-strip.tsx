"use client";

import { useSessionQuery } from "@/hooks/generation-hook";
import {
  activeSessionIdAtom,
  activeSnapshotIdAtom,
} from "@/store/generation-store";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";

// Vertical list of snapshots inside the active session. Mirrors the chevron
// nav but as a scrollable list with thumbnail + prompt + params, so the
// user can scan a long iteration trail at a glance. Newest snapshot is at
// the top (matches the chevron ordering).
//
// Hides when there's no active session (the placeholder column already
// tells the user to pick or generate something).
export function RecentStrip() {
  const t = useTranslations();
  const [activeSessionId] = useAtom(activeSessionIdAtom);
  const [activeSnapshotId, setActiveSnapshotId] = useAtom(activeSnapshotIdAtom);
  const query = useSessionQuery(activeSessionId);
  const snapshots = query.data?.snapshots ?? [];

  if (!activeSessionId || snapshots.length === 0) return null;

  // Absolute datetime for the snapshot row. Same-day entries skip the date
  // ("14:32"); older entries show date + time ("Mar 5 14:32"); cross-year
  // entries include the year. Locale-aware via toLocale* formatters.
  const fmtDateTime = (when: Date | string | number | null | undefined) => {
    if (!when) return "";
    const d = new Date(when);
    const now = new Date();
    const time = d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) return time;
    const sameYear = d.getFullYear() === now.getFullYear();
    const date = d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      ...(sameYear ? {} : { year: "numeric" }),
    });
    return `${date} ${time}`;
  };

  const swapTo = (snapshotId: string) => {
    setActiveSnapshotId(snapshotId);
    const url = new URL(window.location.href);
    url.searchParams.set("snap", snapshotId);
    window.history.replaceState(null, "", url.toString());
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-xs">
        {t("IMAGE.SESSION_SNAPSHOTS")}
      </p>
      <div className="thin-scrollbar flex max-h-96 flex-col gap-2 overflow-y-auto pr-1">
        {snapshots.map((snap) => {
          const images =
            (snap as { images?: { r2Url: string }[] }).images ?? [];
          const firstImage = images[0];
          const extra = images.length > 1 ? images.length - 1 : 0;
          const isActive = activeSnapshotId === snap.id;
          const params =
            snap.params && typeof snap.params === "object"
              ? (snap.params as Record<string, unknown>)
              : null;
          return (
            <button
              key={snap.id}
              type="button"
              title={snap.prompt}
              onClick={() => swapTo(snap.id)}
              className={
                "bg-muted ring-offset-background flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors " +
                (isActive ? "ring-ring ring-2" : "hover:ring-ring hover:ring-1")
              }
            >
              <div className="bg-background relative h-16 w-16 shrink-0 overflow-hidden rounded">
                {firstImage?.r2Url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- R2
                  <img
                    src={firstImage.r2Url}
                    alt={snap.prompt}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-muted-foreground absolute inset-0 flex items-center justify-center text-[10px]">
                    {snap.status === "failure" ? "!" : (snap.progress ?? "?")}
                  </div>
                )}
                {extra > 0 && (
                  <span className="bg-background/80 text-foreground absolute right-1 bottom-1 rounded px-1 text-[10px] font-medium">
                    +{extra}
                  </span>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm">{snap.prompt}</span>
                <span className="text-muted-foreground text-xs">
                  {snap.model}
                  {params?.steps !== undefined && (
                    <>
                      {" · "}steps {String(params.steps)}
                    </>
                  )}
                  {params?.cfg !== undefined && (
                    <>
                      {" · "}cfg {String(params.cfg)}
                    </>
                  )}
                  {params?.guidance !== undefined && (
                    <>
                      {" · "}g {String(params.guidance)}
                    </>
                  )}
                  {params?.seed !== undefined && (
                    <>
                      {" · "}seed {String(params.seed)}
                    </>
                  )}
                  {snap.createdAt && (
                    <>
                      {" · "}
                      {fmtDateTime(snap.createdAt as never)}
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
