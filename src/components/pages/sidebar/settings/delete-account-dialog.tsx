"use client";

import { useAuthQuery } from "@/hooks/auth-hook";
import { useDeleteSelfMutation } from "@/hooks/settings-hook";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function DeleteAccountDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const authQuery = useAuthQuery();
  const deleteSelfMutation = useDeleteSelfMutation();
  const router = useRouter();
  const [confirmInput, setConfirmInput] = useState("");

  const username = authQuery.data?.username || "";

  function handleDelete() {
    if (confirmInput !== username) return;
    deleteSelfMutation.mutate(undefined, {
      onSuccess: () => {
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
        <div className="space-y-3 py-4">
          <Label>
            {t("SETTINGS.SECURITY.DELETE_ACCOUNT_CONFIRM", { username })}
          </Label>
          <Input
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder={username}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>
            {t("SETTINGS.CANCEL")}
          </Button>
          <Button
            variant="destructive"
            disabled={confirmInput !== username || deleteSelfMutation.isPending}
            onClick={handleDelete}
          >
            {t("SETTINGS.SECURITY.DELETE_ACCOUNT_BUTTON")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
