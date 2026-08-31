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
import { useCreateGiftCardMutation } from "@/hooks/billing/partner-hook";
import { dollarsToQuota, renderQuota } from "@/lib/config/constants";
import {
  giftCardSchema,
  type GiftCardSchema,
} from "@/lib/validation/gift-cards";
import { formDefaults } from "@/lib/validation/helpers";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type CreateCardDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: number;
};

export function CreateCardDialog(props: CreateCardDialogProps) {
  const t = useTranslations();
  const createMutation = useCreateGiftCardMutation();

  const form = useForm({
    resolver: typeboxResolver(giftCardSchema),
    defaultValues: formDefaults(giftCardSchema),
  });

  function onSubmit(data: GiftCardSchema) {
    const quota = dollarsToQuota(data.amount);
    createMutation.mutate(
      { body: { name: data.name, quota } },
      {
        onSuccess: () => {
          toast.success(t("GIFT_CARDS.SUCCESS_CREATE"));
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
          <DialogTitle>{t("GIFT_CARDS.CREATE")}</DialogTitle>
          <DialogDescription>{t("GIFT_CARDS.CREATE_DESC")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <MyFormInput
              control={form.control}
              name="name"
              schema={giftCardSchema}
              label={t("GIFT_CARDS.NAME")}
              type="text"
            />
            <MyFormInput
              control={form.control}
              name="amount"
              schema={giftCardSchema}
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
              <Button type="submit" disabled={createMutation.isPending}>
                {t("GIFT_CARDS.CREATE")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
