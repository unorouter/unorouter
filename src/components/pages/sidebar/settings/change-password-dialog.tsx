"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { useUpdateSelfMutation } from "@/hooks/settings-hook";
import {
  changePasswordSchema,
  type ChangePasswordSchema,
} from "@/lib/validation/settings";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { Value } from "@sinclair/typebox/value";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function ChangePasswordDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const updateSelfMutation = useUpdateSelfMutation();

  const form = useForm({
    resolver: typeboxResolver(changePasswordSchema),
    defaultValues: Value.Default(
      changePasswordSchema,
      {},
    ) as ChangePasswordSchema,
  });

  useEffect(() => {
    if (props.open) {
      form.reset(
        Value.Default(changePasswordSchema, {}) as ChangePasswordSchema,
      );
    }
  }, [props.open, form]);

  function onSubmit(data: ChangePasswordSchema) {
    if (data.password !== data.confirm_password) {
      form.setError("confirm_password", {
        message: t("SETTINGS.SECURITY.PASSWORD_MISMATCH"),
      });
      return;
    }
    updateSelfMutation.mutate(
      {
        body: {
          original_password: data.original_password,
          password: data.password,
        },
      },
      {
        onSuccess: () => {
          toast.success(t("SETTINGS.SECURITY.PASSWORD_CHANGED"));
          props.onOpenChange(false);
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("SETTINGS.SECURITY.CHANGE_PASSWORD")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-4 py-4">
              <MyFormInput
                control={form.control}
                name="original_password"
                schema={changePasswordSchema}
                label={t("SETTINGS.SECURITY.OLD_PASSWORD")}
                type="password"
              />
              <MyFormInput
                control={form.control}
                name="password"
                schema={changePasswordSchema}
                label={t("SETTINGS.SECURITY.NEW_PASSWORD")}
                type="password"
              />
              <MyFormInput
                control={form.control}
                name="confirm_password"
                schema={changePasswordSchema}
                label={t("SETTINGS.SECURITY.CONFIRM_PASSWORD")}
                type="password"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => props.onOpenChange(false)}
              >
                {t("SETTINGS.CANCEL")}
              </Button>
              <Button type="submit" disabled={updateSelfMutation.isPending}>
                {t("SETTINGS.SECURITY.CHANGE_PASSWORD")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
