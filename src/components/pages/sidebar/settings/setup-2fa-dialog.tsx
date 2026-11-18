"use client";

import type { TwoFAMode } from "@/lib/types";
import { Icon } from "@/components/ui/icon";

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
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { formDefaults } from "@/lib/validation/helpers";
import { handleError, copyText } from "@/lib/utils/client";
import {
  needsReverification,
  SecurityVerification,
} from "./security-verification";

export function Setup2FADialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: TwoFAMode;
}) {
  const t = useTranslations();
  const setup2FAMutation = useSetup2FAMutation();
  const enable2FAMutation = useEnable2FAMutation();
  const disable2FAMutation = useDisable2FAMutation();

  const [step, setStep] = useState<"verify" | "qr" | "code">("verify");
  const [setupData, setSetupData] = useState<{
    secret: string;
    qr_code_data: string;
    backup_codes: string[];
    flow_token: string;
  } | null>(null);

  const form = useForm({
    resolver: typeboxResolver(twoFACodeSchema),
    defaultValues: formDefaults(twoFACodeSchema),
  });

  function onProtectedError(error: Error) {
    if (needsReverification(error)) {
      toast.error(t("SETTINGS.SECURITY.VERIFY.EXPIRED"));
      resetState();
      return;
    }
    handleError(error, t);
  }

  function handleSetupVerified(proof: string) {
    setup2FAMutation.mutate(
      { proof },
      {
        onSuccess: (data) => {
          setSetupData({ ...data, backup_codes: data.backup_codes ?? [] });
          setStep("qr");
        },
        onError: onProtectedError,
      },
    );
  }

  function onSubmitEnable(data: TwoFACodeSchema) {
    if (!setupData) return;
    enable2FAMutation.mutate(
      { body: { code: data.code, flow_token: setupData.flow_token } },
      {
        onSuccess: () => {
          toast.success(t("SETTINGS.SECURITY.TWO_FACTOR_ENABLED"));
          props.onOpenChange(false);
          resetState();
        },
        onError: onProtectedError,
      },
    );
  }

  function handleDisableVerified(proof: string) {
    disable2FAMutation.mutate(
      { proof },
      {
        onSuccess: () => {
          toast.success(t("SETTINGS.SECURITY.TWO_FACTOR_DISABLED"));
          props.onOpenChange(false);
          resetState();
        },
        onError: onProtectedError,
      },
    );
  }

  function resetState() {
    setStep("verify");
    setSetupData(null);
    form.reset(formDefaults(twoFACodeSchema));
  }

  function copyBackupCodes() {
    if (!setupData) return;
    void copyText(
      t,
      setupData.backup_codes.join("\n"),
      t("COMMON.COPIED_CLIPBOARD"),
    );
  }

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
          <SecurityVerification
            scope="2fa.disable"
            onVerified={handleDisableVerified}
            busy={disable2FAMutation.isPending}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => props.onOpenChange(false)}
            >
              {t("COMMON.CANCEL")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

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

        {step === "verify" && (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              {t("SETTINGS.SECURITY.TWO_FACTOR_DESC")}
            </p>
            <SecurityVerification
              scope="2fa.setup"
              onVerified={handleSetupVerified}
              busy={setup2FAMutation.isPending}
            />
          </div>
        )}

        {step === "qr" && setupData && (
          <div className="space-y-4">
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

            <div className="space-y-2">
              <Label>{t("SETTINGS.SECURITY.MANUAL_ENTRY")}</Label>
              <div className="bg-muted flex items-center justify-between rounded-md p-2">
                <code className="text-xs break-all">{setupData.secret}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    void copyText(
                      t,
                      setupData.secret,
                      t("COMMON.COPIED_CLIPBOARD"),
                    );
                  }}
                >
                  <Icon name="copy" className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

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
              <Button onClick={() => setStep("code")}>
                {t("SETTINGS.CONTINUE")}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "code" && (
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
