"use client";

import { confirm } from "@/components/ui/confirm";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteSnapshotMutation,
  useExportSessionMutation,
  useSessionQuery,
} from "@/hooks/ai/image-hook";
import { getModelDescriptor } from "@/lib/ai/image/models";
import type { SnapshotView } from "@/lib/types";
import { downloadJson } from "@/lib/utils/client";
import { useTranslations } from "next-intl";
import { snapshotModelLabel } from "./image-constants";
import { useImageNav } from "./image-nav";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BatchGrid, ImageLightbox } from "./history/image-gallery";
import { ParamsBadge, RetentionBadge } from "./result/params-badge";
import { SnapshotImportDialog } from "./result/snapshot-import-dialog";
import { useSnapshotRestoreActions } from "./result/use-snapshot-restore-actions";

type Props = {
  sessionId: string;
  snapshotId: string;
};

export function ImageResult(props: Props) {
  const t = useTranslations();
  const router = useRouter();
  const nav = useImageNav();

  const sessionQuery = useSessionQuery(props.sessionId);
  const deleteMut = useDeleteSnapshotMutation();
  const exportMut = useExportSessionMutation();

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const snapshots: SnapshotView[] = sessionQuery.data?.snapshots ?? [];
  const data = snapshots.find((s) => s.id === props.snapshotId);
  const actions = useSnapshotRestoreActions(data);

  const currentIndex = snapshots.findIndex((s) => s.id === props.snapshotId);
  const total = snapshots.length;

  const onPrevSnapshot = () => {
    if (currentIndex < 0 || total <= 1) return;
    nav.showSnapshot(snapshots[(currentIndex + 1) % total].id);
  };
  const onNextSnapshot = () => {
    if (currentIndex < 0 || total <= 1) return;
    nav.showSnapshot(snapshots[(currentIndex - 1 + total) % total].id);
  };

  const status = data?.status;
  const isFailed = status === "failure";
  const images = data?.images ?? [];
  const isDone = status === "success" && images.length > 0;
  const requestedCount = data?.requestedCount ?? 1;

  // Mobile stacks the result under a tall form; scroll it into view ONCE per snapshot
  // (isDone flaps on refetch, and re-running yanks the page while the user is reading).
  const resultRef = useRef<HTMLDivElement>(null);
  const scrolledForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isDone) return;
    if (scrolledForRef.current === props.snapshotId) return;
    scrolledForRef.current = props.snapshotId;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [isDone, props.snapshotId]);

  const onDeleteSnapshot = async () => {
    const ok = await confirm({
      title: t("COMMON.CONFIRM.DELETE_GENERATION_TITLE"),
      description: t("COMMON.CONFIRM.DELETE_GENERATION_DESC"),
      confirmLabel: t("COMMON.DELETE"),
      cancelLabel: t("COMMON.CANCEL"),
      destructive: true,
    });
    if (!ok) return;
    const result = await deleteMut.mutateAsync({ id: props.snapshotId });
    if (result.sessionDeleted) {
      router.push("/image");
      return;
    }
    const remaining = snapshots.filter((s) => s.id !== props.snapshotId);
    if (remaining.length === 0) {
      router.push("/image");
      return;
    }
    nav.showSnapshot(remaining[0].id);
  };

  const onExport = async () => {
    const payload = await exportMut.mutateAsync({ sessionId: props.sessionId });
    downloadJson(payload, `${props.sessionId}.json`);
  };

  if (!data) {
    return <Skeleton className="aspect-square w-full max-w-2xl rounded-lg" />;
  }

  const showChevrons = total > 1;
  const estimatedSeconds = getModelDescriptor(data.model).estimatedSeconds;

  return (
    <div ref={resultRef} className="flex max-w-2xl flex-col gap-4">
      {showChevrons && (
        <div className="text-muted-foreground flex items-center justify-center gap-3 text-xs">
          <Button
            variant="outline"
            size="icon"
            onClick={onPrevSnapshot}
            aria-label={t("IMAGE.LIGHTBOX_PREV")}
          >
            <Icon name="chevron-left" />
          </Button>
          <span>
            {t("IMAGE.SNAPSHOT_NAV_LABEL", {
              current: currentIndex >= 0 ? currentIndex + 1 : 1,
              total,
            })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={onNextSnapshot}
            aria-label={t("IMAGE.LIGHTBOX_NEXT")}
          >
            <Icon name="chevron-right" />
          </Button>
        </div>
      )}

      {isDone ? (
        <BatchGrid
          images={images}
          prompt={data.prompt}
          snapshotId={props.snapshotId}
          onOpenLightbox={(i) => {
            setLightboxIndex(i);
            setLightboxOpen(true);
          }}
          supportsHires={getModelDescriptor(data.model).supportsHiresFix}
          onQuickAction={actions.onQuickAction}
          onReuseSeed={actions.onReuseSeed}
        />
      ) : isFailed ? (
        <div className="bg-muted relative aspect-square w-full overflow-hidden rounded-lg">
          <div className="text-destructive flex h-full flex-col items-center justify-center p-4 text-center text-sm">
            <p className="font-medium">{t("IMAGE.STATUS_FAILURE")}</p>
            {data.errorMessage && (
              <p className="mt-2 text-xs opacity-70">{data.errorMessage}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-muted relative aspect-square w-full overflow-hidden rounded-lg">
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <Skeleton className="h-full w-full" />
            <p className="text-muted-foreground absolute text-sm">
              {requestedCount > 1
                ? t("IMAGE.PROGRESS_OF_N", {
                    current: images.length,
                    total: requestedCount,
                  })
                : `${estimatedSeconds}s`}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <ParamsBadge
          model={snapshotModelLabel(data.model, data.extraParams)}
          params={data.params}
        />
        {data.expiresAt && <RetentionBadge expiresAt={data.expiresAt} />}
      </div>

      <p className="text-sm">{data.prompt}</p>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={() => router.push(`/image?remix=${props.snapshotId}`)}
        >
          <Icon name="sparkles" className="mr-2" />
          {t("IMAGE.REMIX")}
        </Button>
        {/* Hires is per-image (hover actions); this shortcut carries the result along as
            the init image so a region can be redrawn without re-uploading it. */}
        {isDone && getModelDescriptor(data.model).supportsStrength && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(`/image?remix=${props.snapshotId}&inpaint=1`)
            }
          >
            <Icon name="paintbrush" className="mr-2" />
            {t("IMAGE.INPAINT_SHORTCUT")}
          </Button>
        )}
        {isDone && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={exportMut.isPending}
          >
            <Icon name="download" className="mr-2" />
            {t("IMAGE.EXPORT")}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setImportDialogOpen(true)}
        >
          <Icon name="upload" className="mr-2" />
          {t("IMAGE.IMPORT")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDeleteSnapshot}
          disabled={deleteMut.isPending}
        >
          <Icon name="trash-2" className="mr-2" />
          {t("IMAGE.DELETE")}
        </Button>
      </div>

      <ImageLightbox
        images={images}
        startIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        snapshotId={props.snapshotId}
        alt={data.prompt}
      />

      <SnapshotImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
    </div>
  );
}
