"use client";

import { useAuthQuery } from "@/hooks/auth-hook";
import {
  useSendSettingsVerificationMutation,
  useUpdateSelfMutation,
} from "@/hooks/settings-hook";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { LuGithub, LuMail } from "react-icons/lu";
import { SiDiscord } from "react-icons/si";

export function AccountCard() {
  const t = useTranslations();
  const authQuery = useAuthQuery();
  const user = authQuery.data;
  const updateSelfMutation = useUpdateSelfMutation();
  const sendVerificationMutation = useSendSettingsVerificationMutation();

  const [emailInput, setEmailInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [showEmailForm, setShowEmailForm] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  if (!user) return null;

  const emailBound = !!user.email;

  function handleSendCode() {
    if (!emailInput) return;
    sendVerificationMutation.mutate(
      { email: emailInput },
      {
        onSuccess: () => {
          toast.success(t("SETTINGS.ACCOUNT.CODE_SENT", { seconds: 60 }));
          setCountdown(60);
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  }

  function handleBindEmail() {
    if (!emailInput || !codeInput) return;
    updateSelfMutation.mutate(
      { email: emailInput, verification_code: codeInput },
      {
        onSuccess: () => {
          toast.success(t("SETTINGS.ACCOUNT.EMAIL_BOUND"));
          setShowEmailForm(false);
          setEmailInput("");
          setCodeInput("");
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.unorouter.ai";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("SETTINGS.ACCOUNT.TITLE")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Binding */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <LuMail className="text-muted-foreground h-4 w-4" />
            <span className="font-medium">{t("SETTINGS.ACCOUNT.EMAIL_BINDING")}</span>
          </div>

          {!showEmailForm ? (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                {emailBound ? user.email : t("SETTINGS.ACCOUNT.EMAIL_NOT_BOUND")}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowEmailForm(true);
                  if (emailBound) setEmailInput(user.email);
                }}
              >
                {emailBound
                  ? t("SETTINGS.ACCOUNT.MODIFY_EMAIL")
                  : t("SETTINGS.ACCOUNT.BIND_EMAIL")}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder={t("SETTINGS.ACCOUNT.EMAIL_PLACEHOLDER")}
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={!emailInput || countdown > 0 || sendVerificationMutation.isPending}
                  onClick={handleSendCode}
                >
                  {countdown > 0
                    ? `${countdown}s`
                    : t("SETTINGS.ACCOUNT.SEND_CODE")}
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder={t("SETTINGS.ACCOUNT.CODE_PLACEHOLDER")}
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                />
                <Button
                  size="sm"
                  className="shrink-0"
                  disabled={!emailInput || !codeInput || updateSelfMutation.isPending}
                  onClick={handleBindEmail}
                >
                  {t("SETTINGS.ACCOUNT.BIND")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowEmailForm(false);
                    setEmailInput("");
                    setCodeInput("");
                  }}
                >
                  {t("SETTINGS.CANCEL")}
                </Button>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* OAuth Bindings */}
        <div className="space-y-3">
          <Label>{t("SETTINGS.ACCOUNT.OAUTH_BINDINGS")}</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {/* GitHub */}
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-2">
                <LuGithub className="h-5 w-5" />
                <div>
                  <span className="text-sm font-medium">
                    {t("SETTINGS.ACCOUNT.GITHUB")}
                  </span>
                  <p className="text-muted-foreground text-xs">
                    {user.github_id
                      ? t("SETTINGS.ACCOUNT.BOUND")
                      : t("SETTINGS.ACCOUNT.NOT_BOUND")}
                  </p>
                </div>
              </div>
              {!user.github_id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.location.href = `${apiUrl}/api/oauth/github?bind=true`;
                  }}
                >
                  {t("SETTINGS.ACCOUNT.BIND")}
                </Button>
              )}
            </div>

            {/* Discord */}
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-2">
                <SiDiscord className="h-5 w-5" />
                <div>
                  <span className="text-sm font-medium">
                    {t("SETTINGS.ACCOUNT.DISCORD")}
                  </span>
                  <p className="text-muted-foreground text-xs">
                    {user.discord_id
                      ? t("SETTINGS.ACCOUNT.BOUND")
                      : t("SETTINGS.ACCOUNT.NOT_BOUND")}
                  </p>
                </div>
              </div>
              {!user.discord_id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.location.href = `${apiUrl}/api/oauth/discord?bind=true`;
                  }}
                >
                  {t("SETTINGS.ACCOUNT.BIND")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
