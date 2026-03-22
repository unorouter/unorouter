"use client";

import { useUpdateSelfMutation } from "@/hooks/settings-hook";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

export function ChangePasswordDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const updateSelfMutation = useUpdateSelfMutation();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function handleSubmit() {
    if (newPassword !== confirmPassword) {
      toast.error(t("SETTINGS.SECURITY.PASSWORD_MISMATCH"));
      return;
    }
    updateSelfMutation.mutate(
      { original_password: oldPassword, password: newPassword },
      {
        onSuccess: () => {
          toast.success(t("SETTINGS.SECURITY.PASSWORD_CHANGED"));
          props.onOpenChange(false);
          setOldPassword("");
          setNewPassword("");
          setConfirmPassword("");
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
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t("SETTINGS.SECURITY.OLD_PASSWORD")}</Label>
            <Input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("SETTINGS.SECURITY.NEW_PASSWORD")}</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("SETTINGS.SECURITY.CONFIRM_PASSWORD")}</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => props.onOpenChange(false)}
          >
            {t("SETTINGS.CANCEL")}
          </Button>
          <Button
            disabled={
              !oldPassword ||
              !newPassword ||
              !confirmPassword ||
              updateSelfMutation.isPending
            }
            onClick={handleSubmit}
          >
            {t("SETTINGS.SECURITY.CHANGE_PASSWORD")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
