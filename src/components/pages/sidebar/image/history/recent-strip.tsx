"use client";

import { SmartImage } from "@/components/ui/smart-image";
import { useSessionQuery } from "@/hooks/ai/image-hook";
import { dayjs } from "@/lib/utils/format/date";
import { renderQuota } from "@/lib/utils/format/number";
import { snapshotModelLabel } from "../image-constants";
import { useImageNav } from "../image-nav";
import { useTranslations } from "next-intl";

export function RecentStrip() {
  const t = useTranslations();
  const nav = useImageNav();
  const query = useSessionQuery(nav.sessionId);
  const snapshots = query.data?.snapshots ?? [];

  if (!nav.sessionId || snapshots.length === 0) return null;

  const fmtDateTime = (when: Date | string | number | null | undefined) => {
    if (!when) return "";
    const d = dayjs(when);
    const now = dayjs();
    if (d.isSame(now, "day")) return d.format("HH:mm");
    return d.format(d.isSame(now, "year") ? "MMM D HH:mm" : "MMM D YYYY HH:mm");
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-xs">
        {t("IMAGE.SESSION_SNAPSHOTS")}
      </p>
      <div className="thin-scrollbar flex max-h-96 flex-col gap-2 overflow-y-auto pr-1">
        {snapshots.map((snap) => {
          const images = snap.images;
          const firstImage = images[0];
          const extra = images.length > 1 ? images.length - 1 : 0;
          const isActive = nav.snapshotId === snap.id;
          const params = snap.params;
          return (
            <button
              key={snap.id}
              type="button"
              title={snap.prompt}
              onClick={() => nav.showSnapshot(snap.id)}
              className={
                "bg-muted ring-offset-background flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors " +
                (isActive ? "ring-ring ring-2" : "hover:ring-ring hover:ring-1")
              }
            >
              <div className="bg-background relative h-16 w-16 shrink-0 overflow-hidden rounded">
                {firstImage?.src ? (
                  <SmartImage
                    src={firstImage.src}
                    alt={snap.prompt}
                    fill
                    sizes="64px"
                    className="object-cover"
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
                  {snapshotModelLabel(snap.model, snap.extraParams)}
                  {params?.steps !== undefined && (
                    <>
                      {" / "}steps {params.steps}
                    </>
                  )}
                  {params?.cfg !== undefined && (
                    <>
                      {" / "}cfg {params.cfg}
                    </>
                  )}
                  {params?.guidance !== undefined && (
                    <>
                      {" / "}g {params.guidance}
                    </>
                  )}
                  {params?.seed !== undefined && (
                    <>
                      {" / "}seed {params.seed}
                    </>
                  )}
                  {snap.costQuota != null && (
                    <>
                      {" / "}
                      {/* Three decimals: GPU-time prices differ below two. */}
                      <span className="text-foreground tabular-nums">
                        {renderQuota(snap.costQuota, 3)}
                      </span>
                    </>
                  )}
                  {snap.createdAt && (
                    <>
                      {" / "}
                      {fmtDateTime(snap.createdAt)}
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
