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
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { useDeleteSelfMutation } from "@/hooks/auth/settings-hook";
import {
  deleteAccountSchema,
  type DeleteAccountSchema,
} from "@/lib/validation/settings";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { formDefaults } from "@/lib/validation/helpers";
import { handleError } from "@/lib/utils/client";
import {
  needsReverification,
  SecurityVerification,
} from "./security-verification";

export function DeleteAccountDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const authQuery = useAuthQuery();
  const deleteSelfMutation = useDeleteSelfMutation();
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);

  const username = authQuery.data?.username || "";

  const form = useForm({
    resolver: typeboxResolver(deleteAccountSchema),
    defaultValues: formDefaults(deleteAccountSchema),
  });

  useEffect(() => {
    if (props.open) {
      form.reset(formDefaults(deleteAccountSchema));
    }
  }, [props.open, form]);

  function handleOpenChange(open: boolean) {
    if (!open) setConfirmed(false);
    props.onOpenChange(open);
  }

  function onSubmit(data: DeleteAccountSchema) {
    if (data.username !== username) {
      form.setError("username", {
        message: t("FORM.ERROR.REQUIRED"),
      });
      return;
    }
    setConfirmed(true);
  }

  // The dialog keeps showing verification, so a refused proof leaves the user
  // one step from trying again.
  function handleVerified(proof: string) {
    deleteSelfMutation.mutate(
      { proof },
      {
        onSuccess: () => {
          toast.success(t("SETTINGS.SECURITY.ACCOUNT_DELETED"));
          router.push("/");
        },
        onError: (error) => {
          if (needsReverification(error)) {
            toast.error(t("SETTINGS.SECURITY.VERIFY.EXPIRED"));
            return;
          }
          handleError(error, t);
        },
      },
    );
  }

  return (
    <Dialog open={props.open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">
            {t("SETTINGS.SECURITY.DELETE_ACCOUNT")}
          </DialogTitle>
          <DialogDescription>
            {t("SETTINGS.SECURITY.DELETE_ACCOUNT_DESC")}
          </DialogDescription>
        </DialogHeader>
        {confirmed ? (
          <>
            <SecurityVerification
              scope="account.delete"
              onVerified={handleVerified}
              busy={deleteSelfMutation.isPending}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                {t("COMMON.CANCEL")}
              </Button>
            </DialogFooter>
          </>
        ) : (
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
                  onClick={() => handleOpenChange(false)}
                >
                  {t("COMMON.CANCEL")}
                </Button>
                <Button type="submit" variant="destructive">
                  {t("SETTINGS.SECURITY.DELETE_ACCOUNT_BUTTON")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
