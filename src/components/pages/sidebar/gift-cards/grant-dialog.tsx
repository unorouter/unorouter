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
import { useGrantQuotaMutation } from "@/hooks/billing/partner-hook";
import { dollarsToQuota, renderQuota } from "@/lib/config/constants";
import { grantSchema, type GrantSchema } from "@/lib/validation/gift-cards";
import { formDefaults } from "@/lib/validation/helpers";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type GrantDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: number;
};

export function GrantDialog(props: GrantDialogProps) {
  const t = useTranslations();
  const grantMutation = useGrantQuotaMutation();

  const form = useForm({
    resolver: typeboxResolver(grantSchema),
    defaultValues: formDefaults(grantSchema),
  });

  function onSubmit(data: GrantSchema) {
    grantMutation.mutate(
      { body: { user_id: data.user_id, quota: dollarsToQuota(data.amount) } },
      {
        onSuccess: () => {
          toast.success(t("GIFT_CARDS.SUCCESS_GRANT"));
          form.reset();
          props.onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("GIFT_CARDS.GRANT")}</DialogTitle>
          <DialogDescription>{t("GIFT_CARDS.GRANT_DESC")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <MyFormInput
              control={form.control}
              name="user_id"
              schema={grantSchema}
              label={t("GIFT_CARDS.RECIPIENT")}
              type="number"
            />
            <MyFormInput
              control={form.control}
              name="amount"
              schema={grantSchema}
              label={t("GIFT_CARDS.AMOUNT")}
              type="number"
              symbol="$"
            />
            <p className="text-muted-foreground text-xs">
              {t("GIFT_CARDS.BALANCE")}: {renderQuota(props.balance)}
            </p>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => props.onOpenChange(false)}
              >
                {t("COMMON.CANCEL")}
              </Button>
              <Button type="submit" disabled={grantMutation.isPending}>
                {t("GIFT_CARDS.GRANT")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
