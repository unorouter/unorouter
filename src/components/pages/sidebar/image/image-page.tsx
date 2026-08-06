"use client";

import { ImageForm } from "@/components/pages/sidebar/image/form/image-form";
import { ImageResult } from "@/components/pages/sidebar/image/image-result";
import { Img2ImgSubPills } from "@/components/pages/sidebar/image/form/img2img-sub-pills";
import { ModeTabs } from "@/components/pages/sidebar/image/form/mode-tabs";
import { RecentStrip } from "@/components/pages/sidebar/image/history/recent-strip";
import { useSessionQuery } from "@/hooks/ai/image-hook";
import {
  activeSessionIdAtom,
  activeSnapshotIdAtom,
  activeSubPillAtom,
  activeTabAtom,
} from "@/store/image-store";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useQueryStates } from "nuqs";
import { useEffect } from "react";
import { IMAGE_URL_PARSERS } from "./image-url-state";

export function ImagePage(props: { sessionId?: string; snapshotId?: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [activeSessionId, setActiveSessionId] = useAtom(activeSessionIdAtom);
  const [activeSnapshotId, setActiveSnapshotId] = useAtom(activeSnapshotIdAtom);
  const [urlState, setUrlState] = useQueryStates(IMAGE_URL_PARSERS);

  const setActiveTab = useSetAtom(activeTabAtom);
  const setActiveSubPill = useSetAtom(activeSubPillAtom);

  // The URL wins over the server prop. `props.snapshotId` is read from searchParams DURING
  // THE SERVER RENDER, so it freezes at whatever the page loaded with; a client-side
  // `setUrlState` never re-runs it. Preferring the prop made this effect stomp the atom back
  // to the stale snapshot on the next render, which locked the view to the old image and
  // made every snapshot change take two clicks.
  useEffect(() => {
    setActiveSessionId(props.sessionId ?? null);
    setActiveSnapshotId(urlState.snap ?? props.snapshotId ?? null);
  }, [
    props.sessionId,
    props.snapshotId,
    urlState.snap,
    setActiveSessionId,
    setActiveSnapshotId,
  ]);

  useEffect(() => {
    setActiveTab(urlState.tab);
  }, [urlState.tab, setActiveTab]);

  useEffect(() => {
    setActiveSubPill(urlState.mode);
  }, [urlState.mode, setActiveSubPill]);

  const sessionQuery = useSessionQuery(props.sessionId);

  useEffect(() => {
    if (!props.sessionId) return;
    if (activeSnapshotId) return;
    const snaps = sessionQuery.data?.snapshots ?? [];
    if (snaps.length === 0) return;
    setActiveSnapshotId(snaps[0].id);
    void setUrlState({ snap: snaps[0].id }, { history: "replace" });
  }, [
    props.sessionId,
    activeSnapshotId,
    sessionQuery.data,
    setActiveSnapshotId,
    setUrlState,
  ]);

  useEffect(() => {
    if (!props.sessionId) return;
    if (sessionQuery.isError) {
      router.replace("/image");
    }
  }, [props.sessionId, sessionQuery.isError, router]);

  const activeTab = useAtomValue(activeTabAtom);

  return (
    <div className="thin-scrollbar flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-4 md:p-6 lg:flex-row lg:overflow-hidden">
      <div className="thin-scrollbar flex-1 lg:overflow-y-auto lg:pr-2">
        <div className="flex max-w-2xl flex-col gap-4">
          <ModeTabs />
          {activeTab === "img2img" && <Img2ImgSubPills />}
          <ImageForm />
        </div>
      </div>

      <div className="thin-scrollbar flex flex-1 flex-col gap-6 lg:overflow-y-auto lg:pl-2">
        {activeSessionId && activeSnapshotId ? (
          <ImageResult
            sessionId={activeSessionId}
            snapshotId={activeSnapshotId}
          />
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
