"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { useAuthQuery } from "@/hooks/auth-hook";
import { analytics } from "@/lib/analytics";
import { useDeleteSelfMutation } from "@/hooks/settings-hook";
import {
  deleteAccountSchema,
  type DeleteAccountSchema,
} from "@/lib/validation/settings";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { Value } from "@sinclair/typebox/value";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function DeleteAccountDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const authQuery = useAuthQuery();
  const deleteSelfMutation = useDeleteSelfMutation();
  const router = useRouter();

  const username = authQuery.data?.username || "";

  const form = useForm({
    resolver: typeboxResolver(deleteAccountSchema),
    defaultValues: Value.Default(
      deleteAccountSchema,
      {},
    ) as DeleteAccountSchema,
  });

  useEffect(() => {
    if (props.open) {
      form.reset(Value.Default(deleteAccountSchema, {}) as DeleteAccountSchema);
    }
  }, [props.open, form]);

  function onSubmit(data: DeleteAccountSchema) {
    if (data.username !== username) {
      form.setError("username", {
        message: t("FORM.ERROR.REQUIRED"),
      });
      return;
    }
    deleteSelfMutation.mutate(undefined, {
      onSuccess: () => {
        analytics.settings.accountDeleted();
        toast.success(t("SETTINGS.SECURITY.ACCOUNT_DELETED"));
        router.push("/");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">
            {t("SETTINGS.SECURITY.DELETE_ACCOUNT")}
          </DialogTitle>
          <DialogDescription>
            {t("SETTINGS.SECURITY.DELETE_ACCOUNT_DESC")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-3 py-4">
              <MyFormInput
                control={form.control}
                name="username"
                schema={deleteAccountSchema}
                label={t("SETTINGS.SECURITY.DELETE_ACCOUNT_CONFIRM", {
                  username,
                })}
                placeholder={username}
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
              <Button
                type="submit"
                variant="destructive"
                disabled={deleteSelfMutation.isPending}
              >
                {t("SETTINGS.SECURITY.DELETE_ACCOUNT_BUTTON")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
