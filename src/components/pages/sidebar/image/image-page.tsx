"use client";

import { ImageForm } from "@/components/pages/sidebar/image/form/image-form";
import { ImageResult } from "@/components/pages/sidebar/image/image-result";
import {
  Img2ImgSubPills,
  ModeTabs,
} from "@/components/pages/sidebar/image/form/mode-tabs";
import { RecentStrip } from "@/components/pages/sidebar/image/history/recent-strip";
import { useSessionQuery } from "@/hooks/ai/image-hook";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useImageNav } from "./image-nav";

export function ImagePage() {
  const t = useTranslations();
  const router = useRouter();
  const nav = useImageNav();

  const sessionQuery = useSessionQuery(nav.sessionId);

  // A session route with no snapshot in the URL shows its newest one.
  useEffect(() => {
    if (!nav.sessionId || nav.snapshotId) return;
    const snaps = sessionQuery.data?.snapshots ?? [];
    if (snaps.length === 0) return;
    nav.replaceSnapshot(snaps[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nav methods are stable per render; re-run on data/route changes only
  }, [nav.sessionId, nav.snapshotId, sessionQuery.data]);

  useEffect(() => {
    if (!nav.sessionId) return;
    if (sessionQuery.isError) {
      router.replace("/image");
    }
  }, [nav.sessionId, sessionQuery.isError, router]);

  return (
    <div className="thin-scrollbar flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-4 md:p-6 lg:flex-row lg:overflow-hidden">
      <div className="thin-scrollbar flex-1 lg:overflow-y-auto lg:pr-2">
        <div className="flex max-w-2xl flex-col gap-4">
          <ModeTabs />
          {nav.tab === "img2img" && <Img2ImgSubPills />}
          <ImageForm />
        </div>
      </div>

      <div className="thin-scrollbar flex flex-1 flex-col gap-6 lg:overflow-y-auto lg:pl-2">
        {nav.sessionId && nav.snapshotId ? (
          <ImageResult sessionId={nav.sessionId} snapshotId={nav.snapshotId} />
        ) : (
          <div className="text-muted-foreground flex h-full min-h-40 items-center justify-center rounded-lg border border-dashed p-8 text-center text-sm">
            {t("IMAGE.PICK_OR_GENERATE")}
          </div>
        )}
        <RecentStrip />
      </div>
    </div>
  );
}
