"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTransferAffQuotaMutation } from "@/hooks/affiliate-hook";
import {
  dollarsToQuota,
  quotaToDollars,
  renderQuota,
} from "@/lib/config/constants";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LuArrowRightLeft } from "react-icons/lu";
import { toast } from "sonner";

type TransferDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingQuota: number;
};

export function TransferDialog(props: TransferDialogProps) {
  const t = useTranslations();
  const transferMutation = useTransferAffQuotaMutation();
  const [transferAmount, setTransferAmount] = useState("");

  function handleTransfer() {
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error(t("AFFILIATE.TRANSFER_INVALID"));
      return;
    }
    const quotaUnits = dollarsToQuota(amount);
    if (quotaUnits > props.pendingQuota) {
      toast.error(t("AFFILIATE.TRANSFER_EXCEEDS"));
      return;
    }
    transferMutation.mutate(quotaUnits, {
      onSuccess: () => {
        toast.success(t("AFFILIATE.TRANSFER_SUCCESS"));
        props.onOpenChange(false);
        setTransferAmount("");
      },
      onError: (err) =>
        toast.error(
          err instanceof Error && err.message
            ? err.message
            : t("AFFILIATE.TRANSFER_FAILED"),
        ),
    });
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("AFFILIATE.TRANSFER_TITLE")}</DialogTitle>
          <DialogDescription>
            {t("AFFILIATE.TRANSFER_DIALOG_DESC")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">
              {t("AFFILIATE.AVAILABLE")}
            </span>
            <span className="text-foreground font-mono text-sm font-bold tabular-nums">
              {renderQuota(props.pendingQuota)}
            </span>
          </div>
          <div className="space-y-2">
            <Label>{t("AFFILIATE.TRANSFER_AMOUNT")}</Label>
            <div className="relative">
              <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                $
              </span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="0.00"
                className="pl-7"
              />
            </div>
            <div className="flex gap-1">
              {[25, 50, 75, 100].map((pct) => {
                const val =
                  quotaToDollars(props.pendingQuota) * (pct / 100);
                return (
                  <Button
                    key={pct}
                    variant="outline"
                    size="xs"
                    onClick={() => setTransferAmount(val.toFixed(2))}
                    disabled={props.pendingQuota <= 0}
                  >
                    {pct}%
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => props.onOpenChange(false)}
          >
            {t("AFFILIATE.CANCEL")}
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={transferMutation.isPending || !transferAmount}
          >
            <LuArrowRightLeft
              data-icon="inline-start"
              className="h-4 w-4"
            />
            {t("AFFILIATE.CONFIRM_TRANSFER")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
