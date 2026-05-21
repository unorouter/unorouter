"use client";

import { analytics } from "@/lib/analytics";
import type { TwoFAMode } from "@/lib/types";
import { Icon } from "@/components/ui/icon";
import { copyToClipboard } from "@/lib/utils/base";
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  useDisable2FAMutation,
  useEnable2FAMutation,
  useSetup2FAMutation,
} from "@/hooks/auth/settings-hook";
import {
  twoFACodeSchema,
  type TwoFACodeSchema,
} from "@/lib/validation/settings";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { Value } from "@sinclair/typebox/value";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function Setup2FADialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: TwoFAMode;
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

  const form = useForm({
    resolver: typeboxResolver(twoFACodeSchema),
    defaultValues: Value.Default(twoFACodeSchema, {}) as TwoFACodeSchema,
  });

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

  function onSubmitEnable(data: TwoFACodeSchema) {
    enable2FAMutation.mutate(
      { body: { code: data.code } },
      {
        onSuccess: () => {
          analytics.settings.twoFAEnabled();
          toast.success(t("SETTINGS.SECURITY.TWO_FACTOR_ENABLED"));
          props.onOpenChange(false);
          resetState();
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  }

  function onSubmitDisable(data: TwoFACodeSchema) {
    disable2FAMutation.mutate(
      { body: { code: data.code } },
      {
        onSuccess: () => {
          analytics.settings.twoFADisabled();
          toast.success(t("SETTINGS.SECURITY.TWO_FACTOR_DISABLED"));
          props.onOpenChange(false);
          resetState();
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  }

  function resetState() {
    setStep("init");
    setSetupData(null);
    form.reset(Value.Default(twoFACodeSchema, {}) as TwoFACodeSchema);
  }

  function copyBackupCodes() {
    if (!setupData) return;
    copyToClipboard(setupData.backup_codes.join("\n"));
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitDisable)}>
              <div className="py-4">
                <MyFormInput
                  control={form.control}
                  name="code"
                  schema={twoFACodeSchema}
                  placeholder={t("SETTINGS.SECURITY.ENTER_TOTP_CODE")}
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
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
                  disabled={disable2FAMutation.isPending}
                >
                  {t("SETTINGS.SECURITY.DISABLE_2FA")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
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
                <QRCodeSVG
                  value={setupData.qr_code_data}
                  size={192}
                  level="M"
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
                    copyToClipboard(setupData.secret);
                    toast.success(t("SETTINGS.SECURITY.TOKEN_COPIED"));
                  }}
                >
                  <Icon name="copy" className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Backup codes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("SETTINGS.SECURITY.BACKUP_CODES")}</Label>
                <Button variant="ghost" size="sm" onClick={copyBackupCodes}>
                  <Icon name="copy" className="mr-1 h-3 w-3" />
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitEnable)}>
              <div className="space-y-4">
                <MyFormInput
                  control={form.control}
                  name="code"
                  schema={twoFACodeSchema}
                  label={t("SETTINGS.SECURITY.ENTER_TOTP_CODE")}
                  placeholder="000000"
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep("qr")}
                  >
                    {t("SETTINGS.BACK")}
                  </Button>
                  <Button type="submit" disabled={enable2FAMutation.isPending}>
                    {t("SETTINGS.SECURITY.VERIFY_AND_ENABLE")}
                  </Button>
                </DialogFooter>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
