"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { copyToClipboard } from "@/lib/utils/base";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

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
