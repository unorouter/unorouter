"use client";

import {
  useDisable2FAMutation,
  useEnable2FAMutation,
  useSetup2FAMutation,
} from "@/hooks/settings-hook";
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
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { LuCopy } from "react-icons/lu";

export function Setup2FADialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "setup" | "disable";
}) {
  const t = useTranslations();
  const setup2FAMutation = useSetup2FAMutation();
  const enable2FAMutation = useEnable2FAMutation();
  const disable2FAMutation = useDisable2FAMutation();

  const [step, setStep] = useState<"init" | "qr" | "verify">("init");
  const [setupData, setSetupData] = useState<{
    secret: string;
    qr_code_data: string;
    backup_codes: string[];
  } | null>(null);
  const [code, setCode] = useState("");

  function handleSetup() {
    setup2FAMutation.mutate(undefined, {
      onSuccess: (data) => {
        setSetupData(data as typeof setupData);
        setStep("qr");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  }

  function handleEnable() {
    enable2FAMutation.mutate(code, {
      onSuccess: () => {
        toast.success(t("SETTINGS.SECURITY.TWO_FACTOR_ENABLED"));
        props.onOpenChange(false);
        resetState();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  }

  function handleDisable() {
    disable2FAMutation.mutate(code, {
      onSuccess: () => {
        toast.success(t("SETTINGS.SECURITY.TWO_FACTOR_DISABLED"));
        props.onOpenChange(false);
        resetState();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  }

  function resetState() {
    setStep("init");
    setSetupData(null);
    setCode("");
  }

  function copyBackupCodes() {
    if (!setupData) return;
    navigator.clipboard.writeText(setupData.backup_codes.join("\n"));
    toast.success(t("SETTINGS.SECURITY.TOKEN_COPIED"));
  }

  // Disable mode
  if (props.mode === "disable") {
    return (
      <Dialog
        open={props.open}
        onOpenChange={(open) => {
          props.onOpenChange(open);
          if (!open) resetState();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("SETTINGS.SECURITY.DISABLE_2FA")}</DialogTitle>
            <DialogDescription>
              {t("SETTINGS.SECURITY.ENTER_CODE_TO_DISABLE")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder={t("SETTINGS.SECURITY.ENTER_TOTP_CODE")}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => props.onOpenChange(false)}>
              {t("SETTINGS.CANCEL")}
            </Button>
            <Button
              variant="destructive"
              disabled={code.length < 6 || disable2FAMutation.isPending}
              onClick={handleDisable}
            >
              {t("SETTINGS.SECURITY.DISABLE_2FA")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Setup mode
  return (
    <Dialog
      open={props.open}
      onOpenChange={(open) => {
        props.onOpenChange(open);
        if (!open) resetState();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("SETTINGS.SECURITY.SETUP_2FA")}</DialogTitle>
        </DialogHeader>

        {step === "init" && (
          <>
            <p className="text-muted-foreground text-sm">
              {t("SETTINGS.SECURITY.TWO_FACTOR_DESC")}
            </p>
            <DialogFooter>
              <Button
                onClick={handleSetup}
                disabled={setup2FAMutation.isPending}
              >
                {t("SETTINGS.SECURITY.SETUP_2FA")}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "qr" && setupData && (
          <div className="space-y-4">
            {/* QR Code */}
            <div className="space-y-2">
              <Label>{t("SETTINGS.SECURITY.SCAN_QR_CODE")}</Label>
              <div className="flex justify-center rounded-md border bg-white p-4">
                <img
                  src={`data:image/png;base64,${setupData.qr_code_data}`}
                  alt="2FA QR Code"
                  className="h-48 w-48"
                />
              </div>
            </div>

            {/* Manual entry */}
            <div className="space-y-2">
              <Label>{t("SETTINGS.SECURITY.MANUAL_ENTRY")}</Label>
              <div className="bg-muted flex items-center justify-between rounded-md p-2">
                <code className="text-xs break-all">{setupData.secret}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(setupData.secret);
                    toast.success(t("SETTINGS.SECURITY.TOKEN_COPIED"));
                  }}
                >
                  <LuCopy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Backup codes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("SETTINGS.SECURITY.BACKUP_CODES")}</Label>
                <Button variant="ghost" size="sm" onClick={copyBackupCodes}>
                  <LuCopy className="mr-1 h-3 w-3" />
                  {t("SETTINGS.SECURITY.COPY_TOKEN")}
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                {t("SETTINGS.SECURITY.BACKUP_CODES_DESC")}
              </p>
              <div className="bg-muted grid grid-cols-2 gap-1 rounded-md p-3">
                {setupData.backup_codes.map((backupCode) => (
                  <code key={backupCode} className="text-xs">
                    {backupCode}
                  </code>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setStep("verify")}>
                {t("SETTINGS.CONTINUE")}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-4">
            <Label>{t("SETTINGS.SECURITY.ENTER_TOTP_CODE")}</Label>
            <Input
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              className="text-center text-lg tracking-widest"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("qr")}>
                {t("SETTINGS.BACK")}
              </Button>
              <Button
                disabled={code.length < 6 || enable2FAMutation.isPending}
                onClick={handleEnable}
              >
                {t("SETTINGS.SECURITY.VERIFY_AND_ENABLE")}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
