"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { SmartImage } from "@/components/ui/smart-image";
import { copyToClipboard } from "@/lib/utils/base";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export function ImagePreviewDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  videoUrl?: string;
  mjId?: string;
}) {
  const t = useTranslations();
  const url = props.videoUrl || props.imageUrl;
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("LOGS.DRAWING.IMAGE_PREVIEW")}</DialogTitle>
          {props.mjId && (
            <DialogDescription className="font-mono text-xs">
              {props.mjId}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="border-border/40 bg-muted/20 flex justify-center overflow-hidden rounded-md border">
          {props.videoUrl ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              src={props.videoUrl}
              controls
              className="max-h-[60vh] w-full object-contain"
            />
          ) : props.imageUrl ? (
            <SmartImage
              src={props.imageUrl}
              alt={props.mjId || "preview"}
              width={0}
              height={0}
              sizes="100vw"
              className="h-auto max-h-[60vh] w-full object-contain"
            />
          ) : null}
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              copyToClipboard(url);
              toast.success(t("COMMON.COPIED_CLIPBOARD"));
            }}
          >
            <Icon name="copy" className="size-3.5" />
            {t("LOGS.DRAWING.COPY_URL")}
          </Button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium"
          >
            <Icon name="external-link" className="size-3.5" />
            {t("LOGS.DRAWING.OPEN")}
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PromptDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: string;
  promptEn?: string;
}) {
  const t = useTranslations();
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("LOGS.DRAWING.PROMPT")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <PromptBlock
            label={t("LOGS.DRAWING.PROMPT_SOURCE")}
            value={props.prompt}
          />
          {props.promptEn && props.promptEn !== props.prompt && (
            <PromptBlock
              label={t("LOGS.DRAWING.PROMPT_EN")}
              value={props.promptEn}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PromptBlock(props: { label: string; value: string }) {
  const t = useTranslations();
  return (
    <div className="border-border/40 flex flex-col gap-2 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs tracking-wider uppercase">
          {props.label}
        </span>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
          onClick={() => {
            copyToClipboard(props.value);
            toast.success(t("COMMON.COPIED_CLIPBOARD"));
          }}
        >
          <Icon name="copy" className="size-3" />
          {t("LOGS.DRAWING.COPY")}
        </button>
      </div>
      <p className="text-foreground text-sm wrap-break-word whitespace-pre-wrap">
        {props.value}
      </p>
    </div>
  );
}

export function FailReasonDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  failReason: string;
}) {
  const t = useTranslations();
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("LOGS.DRAWING.FAIL_REASON")}</DialogTitle>
        </DialogHeader>
        <div className="border-border/40 flex flex-col gap-2 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs tracking-wider uppercase">
              {t("LOGS.DRAWING.ERROR_DETAILS")}
            </span>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
              onClick={() => {
                copyToClipboard(props.failReason);
                toast.success(t("COMMON.COPIED_CLIPBOARD"));
              }}
            >
              <Icon name="copy" className="size-3" />
              {t("LOGS.DRAWING.COPY")}
            </button>
          </div>
          <p className="text-foreground text-sm wrap-break-word whitespace-pre-wrap">
            {props.failReason}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
