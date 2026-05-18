"use client";

import { GenerateForm } from "@/components/pages/sidebar/playground/form/playground-form";
import { GenerateResult } from "@/components/pages/sidebar/playground/playground-result";
import { Img2ImgSubPills } from "@/components/pages/sidebar/playground/form/img2img-sub-pills";
import { ModeTabs } from "@/components/pages/sidebar/playground/form/mode-tabs";
import { RecentStrip } from "@/components/pages/sidebar/playground/history/recent-strip";
import { useSessionQuery } from "@/hooks/playground-hook";
import {
  activeSessionIdAtom,
  activeSnapshotIdAtom,
  activeTabAtom,
} from "@/store/playground-store";
import { useAtom, useAtomValue } from "jotai";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// /generate           -> placeholder right column, blank form
// /generate/<id>      -> shows that session, defaults to newest snapshot
// /generate/<id>?snap=<sid> -> shows that snapshot inside the session
export function GeneratePage(props: {
  sessionId?: string;
  snapshotId?: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [activeSessionId, setActiveSessionId] = useAtom(activeSessionIdAtom);
  const [activeSnapshotId, setActiveSnapshotId] = useAtom(activeSnapshotIdAtom);

  // Seed atoms from the route on mount + whenever the URL props change.
  useEffect(() => {
    setActiveSessionId(props.sessionId ?? null);
    setActiveSnapshotId(props.snapshotId ?? null);
  }, [
    props.sessionId,
    props.snapshotId,
    setActiveSessionId,
    setActiveSnapshotId,
  ]);

  // Load the session for the chevron view + to pick the newest snapshot
  // when the route didn't carry a ?snap=. The hook auto-skips when
  // sessionId is null.
  const sessionQuery = useSessionQuery(props.sessionId);

  // If the URL only specified a session, default to the newest snapshot
  // once the session loads (otherwise the result column can't render).
  useEffect(() => {
    if (!props.sessionId) return;
    if (activeSnapshotId) return;
    const snaps = sessionQuery.data?.snapshots ?? [];
    if (snaps.length === 0) return;
    setActiveSnapshotId(snaps[0].id);
    const url = new URL(window.location.href);
    url.searchParams.set("snap", snaps[0].id);
    window.history.replaceState(null, "", url.toString());
  }, [
    props.sessionId,
    activeSnapshotId,
    sessionQuery.data,
    setActiveSnapshotId,
  ]);

  // Route bounce: session not found / deleted / expired.
  useEffect(() => {
    if (!props.sessionId) return;
    if (sessionQuery.isError) {
      router.replace("/generate");
    }
  }, [props.sessionId, sessionQuery.isError, router]);

  const activeTab = useAtomValue(activeTabAtom);

  return (
    <div className="thin-scrollbar flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-4 md:p-6 lg:flex-row lg:overflow-hidden">
      <div className="thin-scrollbar flex-1 lg:overflow-y-auto lg:pr-2">
        <div className="flex max-w-2xl flex-col gap-4">
          <ModeTabs />
          {activeTab === "img2img" && <Img2ImgSubPills />}
          <GenerateForm />
        </div>
      </div>

      <div className="thin-scrollbar flex flex-1 flex-col gap-6 lg:overflow-y-auto lg:pl-2">
        {activeSessionId && activeSnapshotId ? (
          <GenerateResult
            sessionId={activeSessionId}
            snapshotId={activeSnapshotId}
          />
        ) : (
          <div className="text-muted-foreground hidden h-full items-center justify-center rounded-lg border border-dashed p-8 text-center text-sm lg:flex">
            {t("IMAGE.PICK_OR_GENERATE")}
          </div>
        )}
        <RecentStrip />
      </div>
    </div>
  );
}
