"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuthQuery } from "@/hooks/auth-hook";
import { env } from "@/lib/config/env";
import {
  useSendSettingsVerificationMutation,
  useUpdateSelfMutation,
} from "@/hooks/settings-hook";
import {
  emailBindSchema,
  type EmailBindSchema,
} from "@/lib/validation/settings";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { Value } from "@sinclair/typebox/value";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { LuGithub, LuMail } from "react-icons/lu";
import { SiDiscord } from "react-icons/si";
import { toast } from "sonner";

export function AccountCard() {
  const t = useTranslations();
  const authQuery = useAuthQuery();
  const user = authQuery.data;
  const updateSelfMutation = useUpdateSelfMutation();
  const sendVerificationMutation = useSendSettingsVerificationMutation();

  const [countdown, setCountdown] = useState(0);
  const [showEmailForm, setShowEmailForm] = useState(false);

  const form = useForm({
    resolver: typeboxResolver(emailBindSchema),
    defaultValues: Value.Default(emailBindSchema, {}) as EmailBindSchema,
  });

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  if (!user) return null;

  const emailBound = !!user.email;
  const emailValue = form.watch("email");

  function handleSendCode() {
    if (!emailValue) return;
    sendVerificationMutation.mutate(
      { query: { email: emailValue } },
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

  function onSubmitEmail(data: EmailBindSchema) {
    updateSelfMutation.mutate(
      {
        body: { email: data.email, verification_code: data.verification_code },
      },
      {
        onSuccess: () => {
          toast.success(t("SETTINGS.ACCOUNT.EMAIL_BOUND"));
          setShowEmailForm(false);
          form.reset(Value.Default(emailBindSchema, {}) as EmailBindSchema);
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  }

  const apiUrl = env.apiUrl || "https://api.unorouter.ai";

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
            <span className="font-medium">
              {t("SETTINGS.ACCOUNT.EMAIL_BINDING")}
            </span>
          </div>

          {!showEmailForm ? (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                {emailBound
                  ? user.email
                  : t("SETTINGS.ACCOUNT.EMAIL_NOT_BOUND")}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowEmailForm(true);
                  if (emailBound) form.setValue("email", user.email);
                }}
              >
                {emailBound
                  ? t("SETTINGS.ACCOUNT.MODIFY_EMAIL")
                  : t("SETTINGS.ACCOUNT.BIND_EMAIL")}
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitEmail)}>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <MyFormInput
                        control={form.control}
                        name="email"
                        schema={emailBindSchema}
                        type="email"
                        placeholder={t("SETTINGS.ACCOUNT.EMAIL_PLACEHOLDER")}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-0.5 shrink-0"
                      disabled={
                        !emailValue ||
                        countdown > 0 ||
                        sendVerificationMutation.isPending
                      }
                      onClick={handleSendCode}
                    >
                      {countdown > 0
                        ? `${countdown}s`
                        : t("SETTINGS.ACCOUNT.SEND_CODE")}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <MyFormInput
                        control={form.control}
                        name="verification_code"
                        schema={emailBindSchema}
                        placeholder={t("SETTINGS.ACCOUNT.CODE_PLACEHOLDER")}
                      />
                    </div>
                    <Button
                      type="submit"
                      size="sm"
                      className="mt-0.5 shrink-0"
                      disabled={updateSelfMutation.isPending}
                    >
                      {t("SETTINGS.ACCOUNT.BIND")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-0.5"
                      onClick={() => {
                        setShowEmailForm(false);
                        form.reset(
                          Value.Default(emailBindSchema, {}) as EmailBindSchema,
                        );
                      }}
                    >
                      {t("SETTINGS.CANCEL")}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
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
