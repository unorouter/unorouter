"use client";

import { Badge } from "@/components/ui/badge";
import { confirm } from "@/components/ui/confirm";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteSnapshotMutation,
  useExportSessionMutation,
  useImportGenerationMutation,
  useSessionQuery,
  useSnapshotStatusQuery,
} from "@/hooks/ai/playground-hook";
import { getModelDescriptor } from "@/lib/ai/playground/models";
import type { GenerationCloneMode } from "@/lib/validation/playground";
import type { SnapshotView } from "@/lib/types";
import { downloadJson, setSearchParam } from "@/lib/utils/client";
import { dayjs } from "@/lib/utils/format/date";
import {
  activeSessionIdAtom,
  activeSnapshotIdAtom,
  activeSubPillAtom,
  activeTabAtom,
  restoreSnapshotIntoFormAtom,
} from "@/store/playground-store";
import { useAtom, useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BatchGrid, ImageLightbox } from "./history/image-gallery";

type Props = {
  sessionId: string;
  snapshotId: string;
};

function ParamsBadge(props: { model: string; params: unknown }) {
  const t = useTranslations();
  const p =
    props.params && typeof props.params === "object"
      ? (props.params as Record<string, unknown>)
      : null;
  return (
    <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
      <span>{props.model}</span>
      {p?.steps !== undefined && (
        <span>
          {t("IMAGE.PARAM_STEPS")} {String(p.steps)}
        </span>
      )}
      {p?.cfg !== undefined && (
        <span>
          {t("IMAGE.PARAM_CFG")} {String(p.cfg)}
        </span>
      )}
      {p?.guidance !== undefined && (
        <span>
          {t("IMAGE.PARAM_GUIDANCE")} {String(p.guidance)}
        </span>
      )}
      {p?.seed !== undefined && (
        <span>
          {t("IMAGE.PARAM_SEED")} {String(p.seed)}
        </span>
      )}
    </div>
  );
}

function RetentionBadge(props: { expiresAt: Date | string | number }) {
  const t = useTranslations();
  const [now] = useState(() => dayjs());
  const daysLeft = dayjs(props.expiresAt).diff(now, "day");
  if (!Number.isFinite(daysLeft) || daysLeft > 7) return null;
  return (
    <Badge variant="outline" className="text-xs">
      {t("IMAGE.EXPIRES_IN_DAYS", { days: Math.max(0, daysLeft) })}
    </Badge>
  );
}

export function GenerateResult(props: Props) {
  const t = useTranslations();
  const router = useRouter();

  const sessionQuery = useSessionQuery(props.sessionId);
  const statusQuery = useSnapshotStatusQuery(props.snapshotId, true);

  const deleteMut = useDeleteSnapshotMutation();
  const exportMut = useExportSessionMutation();
  const importMut = useImportGenerationMutation();

  const [, setActiveSnapshotId] = useAtom(activeSnapshotIdAtom);
  const [, setActiveSessionId] = useAtom(activeSessionIdAtom);
  const setRestore = useSetAtom(restoreSnapshotIntoFormAtom);
  const setActiveTab = useSetAtom(activeTabAtom);
  const setActiveSubPill = useSetAtom(activeSubPillAtom);

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importMode, setImportMode] = useState<GenerationCloneMode>("restore");
  const importFileRef = useRef<HTMLInputElement>(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const snapshots: SnapshotView[] = sessionQuery.data?.snapshots ?? [];
  const cachedSnapshot = snapshots.find((s) => s.id === props.snapshotId);
  const data = statusQuery.data ?? cachedSnapshot;

  const currentIndex = snapshots.findIndex((s) => s.id === props.snapshotId);
  const total = snapshots.length;

  const swapTo = (snapshotId: string) => {
    setActiveSnapshotId(snapshotId);
    setSearchParam("snap", snapshotId);
  };

  const onPrevSnapshot = () => {
    if (currentIndex < 0 || total <= 1) return;
    swapTo(snapshots[(currentIndex + 1) % total].id);
  };
  const onNextSnapshot = () => {
    if (currentIndex < 0 || total <= 1) return;
    swapTo(snapshots[(currentIndex - 1 + total) % total].id);
  };

  useEffect(() => {
    if (!data || currentIndex === 0 || data.status === "failure") return;
    setRestore({
      model: data.model,
      prompt: data.prompt,
      negativePrompt: data.negativePrompt,
      params: data.params,
      loras: data.loras,
      references: data.references,
      extraParams: data.extraParams,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.snapshotId]);

  const status = data?.status;
  const isFailed = status === "failure";
  const images = data?.images ?? [];
  const isDone = status === "success" && images.length > 0;
  const requestedCount = data?.requestedCount ?? 1;

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
      setActiveSessionId(null);
      setActiveSnapshotId(null);
      router.push("/playground");
      return;
    }
    const remaining = snapshots.filter((s) => s.id !== props.snapshotId);
    if (remaining.length === 0) {
      router.push("/playground");
      return;
    }
    swapTo(remaining[0].id);
  };

  const onExport = async () => {
    const payload = await exportMut.mutateAsync({ sessionId: props.sessionId });
    downloadJson(payload, `${props.sessionId}.json`);
  };

  const onImportFile = async (file: File) => {
    const parsed = JSON.parse(await file.text());
    const result = await importMut.mutateAsync({
      payload: parsed,
      mode: importMode,
    });
    setImportDialogOpen(false);
    router.push(`/playground/${result.sessionId}`);
  };

  if (!data) {
    return <Skeleton className="aspect-square w-full max-w-2xl rounded-lg" />;
  }

  const showChevrons = total > 1;

  return (
    <div className="flex max-w-2xl flex-col gap-4">
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
          onQuickAction={(src, target) => {
            setActiveTab(target.tab);
            if (target.subPill) setActiveSubPill(target.subPill);
            setSearchParam("tab", target.tab);
            setSearchParam("mode", target.subPill ?? null);
            setRestore({
              model: data.model,
              prompt: data.prompt,
              negativePrompt: data.negativePrompt,
              params: data.params,
              loras: data.loras,
              references: data.references,
              extraParams: data.extraParams,
              tab: target.tab,
              subPill: target.subPill,
              initImageUrl: src,
            });
          }}
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
                : (data.progress ?? "0%")}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <ParamsBadge model={data.model} params={data.params} />
        {data.expiresAt && <RetentionBadge expiresAt={data.expiresAt} />}
      </div>

      <p className="text-sm">{data.prompt}</p>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={() => router.push(`/playground?remix=${props.snapshotId}`)}
        >
          <Icon name="sparkles" className="mr-2" />
          {t("IMAGE.REMIX")}
        </Button>
        {isDone && getModelDescriptor(data.model).supportsHiresFix && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(`/playground?remix=${props.snapshotId}&hires=1`)
            }
          >
            <Icon name="wand" className="mr-2" />
            {t("IMAGE.HIRES_SHORTCUT")}
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

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("IMAGE.IMPORT_TITLE")}</DialogTitle>
            <DialogDescription>
              {t("IMAGE.IMPORT_DESCRIPTION")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Select
              value={importMode}
              onValueChange={(v) => setImportMode(v as GenerationCloneMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="restore">
                  {t("IMAGE.IMPORT_MODE_RESTORE")}
                </SelectItem>
                <SelectItem value="regenerate">
                  {t("IMAGE.IMPORT_MODE_REGENERATE")}
                </SelectItem>
              </SelectContent>
            </Select>
            <input
              ref={importFileRef}
              type="file"
              accept="application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onImportFile(file);
              }}
              className="text-sm"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
