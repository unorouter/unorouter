"use client";

import { copyToClipboard } from "@/lib/utils/base";
import {
  use2FAStatusQuery,
  useGenerateAccessTokenMutation,
  usePasskeyDeleteMutation,
  usePasskeyRegisterBeginMutation,
  usePasskeyRegisterFinishMutation,
  usePasskeyStatusQuery,
} from "@/hooks/settings-hook";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import {
  LuCopy,
  LuKey,
  LuLock,
  LuFingerprint,
  LuShieldCheck,
  LuTrash2,
} from "react-icons/lu";
import { ChangePasswordDialog } from "./change-password-dialog";
import { Setup2FADialog } from "./setup-2fa-dialog";
import { DeleteAccountDialog } from "./delete-account-dialog";

export function SecurityCard() {
  const t = useTranslations();
  const generateTokenMutation = useGenerateAccessTokenMutation();
  const twoFAStatusQuery = use2FAStatusQuery();
  const passkeyStatusQuery = usePasskeyStatusQuery();
  const passkeyRegisterBeginMutation = usePasskeyRegisterBeginMutation();
  const passkeyRegisterFinishMutation = usePasskeyRegisterFinishMutation();
  const passkeyDeleteMutation = usePasskeyDeleteMutation();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [twoFAMode, setTwoFAMode] = useState<"setup" | "disable">("setup");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const twoFAEnabled = twoFAStatusQuery.data?.enabled === true;
  const passkeyRegistered = passkeyStatusQuery.data?.enabled === true;

  function handleGenerateToken() {
    generateTokenMutation.mutate(undefined, {
      onSuccess: (data) => {
        const token =
          typeof data === "string"
            ? data
            : (data as { data?: string })?.data || "";
        setAccessToken(token);
        toast.success(t("SETTINGS.SECURITY.TOKEN_GENERATED"));
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  }

  function handleCopyToken() {
    if (!accessToken) return;
    copyToClipboard(accessToken);
    toast.success(t("SETTINGS.SECURITY.TOKEN_COPIED"));
  }

  async function handleRegisterPasskey() {
    try {
      const beginData = await passkeyRegisterBeginMutation.mutateAsync();
      const options =
        (beginData as { options?: unknown })?.options || beginData;
      const credential = await navigator.credentials.create({
        publicKey: options as PublicKeyCredentialCreationOptions,
      });
      if (!credential) return;

      const attestationResponse = credential as PublicKeyCredential;
      const response =
        attestationResponse.response as AuthenticatorAttestationResponse;

      const credentialData = {
        id: attestationResponse.id,
        rawId: btoa(
          String.fromCharCode(...new Uint8Array(attestationResponse.rawId)),
        ),
        type: attestationResponse.type as "public-key",
        response: {
          attestationObject: btoa(
            String.fromCharCode(...new Uint8Array(response.attestationObject)),
          ),
          clientDataJSON: btoa(
            String.fromCharCode(...new Uint8Array(response.clientDataJSON)),
          ),
        },
      };

      await passkeyRegisterFinishMutation.mutateAsync({ body: credentialData });
      toast.success(t("SETTINGS.SECURITY.PASSKEY_REGISTERED_SUCCESS"));
    } catch (error) {
      if (error instanceof Error && error.name !== "NotAllowedError") {
        toast.error(error.message);
      }
    }
  }

  function handleDeletePasskey() {
    passkeyDeleteMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(t("SETTINGS.SECURITY.PASSKEY_DELETED"));
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("SETTINGS.SECURITY.TITLE")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Access Token */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <LuKey className="text-muted-foreground h-4 w-4" />
              <span className="font-medium">
                {t("SETTINGS.SECURITY.ACCESS_TOKEN")}
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              {t("SETTINGS.SECURITY.ACCESS_TOKEN_DESC")}
            </p>
            <div className="flex items-center gap-2">
              {accessToken ? (
                <>
                  <code className="bg-muted flex-1 truncate rounded-md p-2 text-xs">
                    {accessToken}
                  </code>
                  <Button variant="outline" size="sm" onClick={handleCopyToken}>
                    <LuCopy className="mr-1 h-3 w-3" />
                    {t("SETTINGS.SECURITY.COPY_TOKEN")}
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={generateTokenMutation.isPending}
                  onClick={handleGenerateToken}
                >
                  <LuKey className="mr-1 h-3 w-3" />
                  {t("SETTINGS.SECURITY.GENERATE_TOKEN")}
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LuLock className="text-muted-foreground h-4 w-4" />
              <span className="font-medium">
                {t("SETTINGS.SECURITY.PASSWORD")}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPasswordDialog(true)}
            >
              {t("SETTINGS.SECURITY.CHANGE_PASSWORD")}
            </Button>
          </div>

          <Separator />

          {/* Passkey */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LuFingerprint className="text-muted-foreground h-4 w-4" />
                <span className="font-medium">
                  {t("SETTINGS.SECURITY.PASSKEY")}
                </span>
                {passkeyRegistered ? (
                  <Badge variant="default">
                    {t("SETTINGS.SECURITY.PASSKEY_REGISTERED")}
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    {t("SETTINGS.SECURITY.PASSKEY_NOT_REGISTERED")}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                {passkeyRegistered ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={passkeyDeleteMutation.isPending}
                    onClick={handleDeletePasskey}
                  >
                    <LuTrash2 className="mr-1 h-3 w-3" />
                    {t("SETTINGS.SECURITY.DELETE_PASSKEY")}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={passkeyRegisterBeginMutation.isPending}
                    onClick={handleRegisterPasskey}
                  >
                    {t("SETTINGS.SECURITY.REGISTER_PASSKEY")}
                  </Button>
                )}
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              {t("SETTINGS.SECURITY.PASSKEY_DESC")}
            </p>
          </div>

          <Separator />

          {/* 2FA */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LuShieldCheck className="text-muted-foreground h-4 w-4" />
                <span className="font-medium">
                  {t("SETTINGS.SECURITY.TWO_FACTOR")}
                </span>
                {twoFAEnabled ? (
                  <Badge variant="default">
                    {t("SETTINGS.SECURITY.TWO_FACTOR_ENABLED")}
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    {t("SETTINGS.SECURITY.TWO_FACTOR_DISABLED")}
                  </Badge>
                )}
              </div>
              <Button
                variant={twoFAEnabled ? "destructive" : "outline"}
                size="sm"
                onClick={() => {
                  setTwoFAMode(twoFAEnabled ? "disable" : "setup");
                  setShow2FADialog(true);
                }}
              >
                {twoFAEnabled
                  ? t("SETTINGS.SECURITY.DISABLE_2FA")
                  : t("SETTINGS.SECURITY.SETUP_2FA")}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              {t("SETTINGS.SECURITY.TWO_FACTOR_DESC")}
            </p>
          </div>

          <Separator />

          {/* Delete Account */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <LuTrash2 className="h-4 w-4 text-red-500" />
                  <span className="font-medium text-red-500">
                    {t("SETTINGS.SECURITY.DELETE_ACCOUNT")}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {t("SETTINGS.SECURITY.DELETE_ACCOUNT_DESC")}
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
              >
                {t("SETTINGS.SECURITY.DELETE_ACCOUNT_BUTTON")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ChangePasswordDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
      />
      <Setup2FADialog
        open={show2FADialog}
        onOpenChange={setShow2FADialog}
        mode={twoFAMode}
      />
      <DeleteAccountDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      />
    </>
  );
}
