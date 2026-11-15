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
import {
  useCreateGiftCardMutation,
  useGrantQuotaMutation,
} from "@/hooks/billing/partner-hook";
import { dollarsToQuota, renderQuota } from "@/lib/config/constants";
import { giftCardSchema, grantSchema } from "@/lib/validation/gift-cards";
import { formDefaults } from "@/lib/validation/helpers";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: number;
};

function QuotaDialog(
  props: DialogProps & {
    title: string;
    description: string;
    pending: boolean;
    onSubmit: () => void;
    children: ReactNode;
  },
) {
  const t = useTranslations();
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>{props.description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={props.onSubmit} className="space-y-4">
          {props.children}
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
            <Button type="submit" disabled={props.pending}>
              {props.title}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreateCardDialog(props: DialogProps) {
  const t = useTranslations();
  const createMutation = useCreateGiftCardMutation();
  const form = useForm({
    resolver: typeboxResolver(giftCardSchema),
    defaultValues: formDefaults(giftCardSchema),
  });
  const onSubmit = form.handleSubmit((data) =>
    createMutation.mutate(
      { body: { name: data.name, quota: dollarsToQuota(data.amount) } },
      {
        onSuccess: () => {
          form.reset();
          props.onOpenChange(false);
        },
      },
    ),
  );

  return (
    <Form {...form}>
      <QuotaDialog
        {...props}
        title={t("GIFT_CARDS.CREATE")}
        description={t("GIFT_CARDS.CREATE_DESC")}
        pending={createMutation.isPending}
        onSubmit={onSubmit}
      >
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
      </QuotaDialog>
    </Form>
  );
}

export function GrantDialog(props: DialogProps) {
  const t = useTranslations();
  const grantMutation = useGrantQuotaMutation();
  const form = useForm({
    resolver: typeboxResolver(grantSchema),
    defaultValues: formDefaults(grantSchema),
  });
  const onSubmit = form.handleSubmit((data) =>
    grantMutation.mutate(
      { body: { user_id: data.user_id, quota: dollarsToQuota(data.amount) } },
      {
        onSuccess: () => {
          form.reset();
          props.onOpenChange(false);
        },
      },
    ),
  );

  return (
    <Form {...form}>
      <QuotaDialog
        {...props}
        title={t("GIFT_CARDS.GRANT")}
        description={t("GIFT_CARDS.GRANT_DESC")}
        pending={grantMutation.isPending}
        onSubmit={onSubmit}
      >
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
      </QuotaDialog>
    </Form>
  );
}
