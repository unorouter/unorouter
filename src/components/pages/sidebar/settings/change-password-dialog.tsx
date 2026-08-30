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
import { analytics } from "@/lib/analytics";
import { useUpdateSelfMutation } from "@/hooks/auth/settings-hook";
import {
  changePasswordSchema,
  type ChangePasswordSchema,
} from "@/lib/validation/settings";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { formDefaults } from "@/lib/validation/helpers";

export function ChangePasswordDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasPassword?: boolean;
}) {
  const t = useTranslations();
  const updateSelfMutation = useUpdateSelfMutation();
  const hasPassword = props.hasPassword ?? true;

  const form = useForm({
    resolver: typeboxResolver(changePasswordSchema),
    defaultValues: formDefaults(changePasswordSchema),
  });

  useEffect(() => {
    if (props.open) {
      form.reset(formDefaults(changePasswordSchema));
    }
  }, [props.open, form]);

  function onSubmit(data: ChangePasswordSchema) {
    if (hasPassword && !data.original_password) {
      form.setError("original_password", {
        message: t("FORM.ERROR.REQUIRED"),
      });
      return;
    }
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
          analytics.settings.passwordChanged();
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
          <DialogTitle>
            {hasPassword
              ? t("SETTINGS.SECURITY.CHANGE_PASSWORD")
              : t("SETTINGS.SECURITY.SET_PASSWORD")}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-4 py-4">
              {hasPassword && (
                <MyFormInput
                  control={form.control}
                  name="original_password"
                  schema={changePasswordSchema}
                  label={t("SETTINGS.SECURITY.OLD_PASSWORD")}
                  type="password"
                />
              )}
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
                {t("COMMON.CANCEL")}
              </Button>
              <Button type="submit" disabled={updateSelfMutation.isPending}>
                {hasPassword
                  ? t("SETTINGS.SECURITY.CHANGE_PASSWORD")
                  : t("SETTINGS.SECURITY.SET_PASSWORD")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
