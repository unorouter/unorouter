"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Label } from "@/components/ui/label";
import { useTransferAffQuotaMutation } from "@/hooks/affiliate-hook";
import { useRouter } from "@/i18n/navigation";
import { analytics } from "@/lib/analytics";
import {
  dollarsToQuota,
  quotaToDollars,
  renderQuota,
} from "@/lib/config/constants";
import {
  transferSchema,
  type TransferSchema,
} from "@/lib/validation/affiliate";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { Value } from "@sinclair/typebox/value";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type TransferDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingQuota: number;
};

export function TransferDialog(props: TransferDialogProps) {
  const t = useTranslations();
  const router = useRouter();
  const transferMutation = useTransferAffQuotaMutation();

  const form = useForm({
    resolver: typeboxResolver(transferSchema),
    defaultValues: Value.Default(transferSchema, {}) as TransferSchema,
  });

  function onSubmit(data: TransferSchema) {
    const quotaUnits = dollarsToQuota(data.amount);
    if (quotaUnits > props.pendingQuota) {
      toast.error(t("AFFILIATE.TRANSFER.EXCEEDS"));
      return;
    }
    transferMutation.mutate(
      { body: { quota: quotaUnits } },
      {
        onSuccess: () => {
          analytics.affiliate.quotaTransferred(data.amount);
          toast.success(t("AFFILIATE.SUCCESS.TRANSFER"));
          props.onOpenChange(false);
          form.reset();
          router.refresh();
        },
        onError: (err) =>
          toast.error(
            err instanceof Error && err.message
              ? err.message
              : t("AFFILIATE.ERROR.TRANSFER"),
          ),
      },
    );
  }

  const amount = form.watch("amount");

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("AFFILIATE.TRANSFER.TITLE")}</DialogTitle>
          <DialogDescription>
            {t("AFFILIATE.TRANSFER.DIALOG_DESC")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
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
                <Label>{t("AFFILIATE.TRANSFER.AMOUNT")}</Label>
                <MyFormInput
                  control={form.control}
                  name="amount"
                  schema={transferSchema}
                  type="number"
                  step="0.01"
                  min="0"
                  symbol="$"
                  placeholder="0.00"
                  validate={(value: number) => {
                    if (dollarsToQuota(value) > props.pendingQuota) {
                      return t("AFFILIATE.TRANSFER.EXCEEDS");
                    }
                    return true;
                  }}
                />
                <div className="flex gap-1">
                  {[25, 50, 75, 100].map((pct) => {
                    const val =
                      quotaToDollars(props.pendingQuota) * (pct / 100);
                    return (
                      <Button
                        key={pct}
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() =>
                          form.setValue("amount", parseFloat(val.toFixed(2)))
                        }
                        disabled={props.pendingQuota <= 0}
                      >
                        {pct}%
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => props.onOpenChange(false)}
              >
                {t("AFFILIATE.CANCEL")}
              </Button>
              <Button
                type="submit"
                disabled={transferMutation.isPending || !amount}
              >
                <Icon
                  name="arrow-right-left"
                  data-icon="inline-start"
                  className="h-4 w-4"
                />
                {t("AFFILIATE.CONFIRM_TRANSFER")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
