"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { buildOAuthAuthorizeUrl } from "@/components/pages/auth/oauth-buttons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { confirm } from "@/components/ui/confirm";
import { Form } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import {
  useBindEmailMutation,
  useSendSettingsVerificationMutation,
  useUnbindOAuthMutation,
} from "@/hooks/auth/settings-hook";
import { useStatusQuery } from "@/hooks/ops/status-hook";
import { analytics } from "@/lib/analytics";
import { rpc } from "@/lib/rpc";
import { copyToClipboard, handleElysia } from "@/lib/utils/base";
import {
  emailBindSchema,
  type EmailBindSchema,
} from "@/lib/validation/settings";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { formDefaults } from "@/lib/validation/helpers";

export function AccountCard() {
  const t = useTranslations();
  const authQuery = useAuthQuery();
  const user = authQuery.data;
  const statusQuery = useStatusQuery();
  const bindEmailMutation = useBindEmailMutation();
  const sendVerificationMutation = useSendSettingsVerificationMutation();
  const unbindOAuthMutation = useUnbindOAuthMutation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [bindLoading, setBindLoading] = useState<string | null>(null);

  const [countdown, setCountdown] = useState(0);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>();
  const turnstileRef = useRef<TurnstileInstance>(null);

  const turnstileEnabled = !!statusQuery.data?.turnstile_check;
  const turnstileSiteKey = statusQuery.data?.turnstile_site_key;

  const form = useForm({
    resolver: typeboxResolver(emailBindSchema),
    defaultValues: formDefaults(emailBindSchema),
  });

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    const bindError = searchParams.get("bind_error");
    if (!bindError) return;
    toast.error(bindError);
    router.replace(pathname);
  }, [searchParams, router, pathname]);

  if (!user) return null;

  const emailBound = !!user.email;
  const emailValue = form.watch("email");

  function handleSendCode() {
    if (!emailValue) return;
    if (turnstileEnabled && !turnstileToken) return;
    sendVerificationMutation.mutate(
      { query: { email: emailValue, turnstile: turnstileToken } },
      {
        onSuccess: () => {
          toast.success(t("SETTINGS.ACCOUNT.CODE_SENT", { seconds: 60 }));
          setCountdown(60);
        },
        onError: (error) => {
          toast.error(error.message);
          turnstileRef.current?.reset();
          setTurnstileToken(undefined);
        },
      },
    );
  }

  function onSubmitEmail(data: EmailBindSchema) {
    bindEmailMutation.mutate(
      {
        query: { email: data.email, code: data.verification_code },
      },
      {
        onSuccess: () => {
          analytics.settings.emailBound();
          toast.success(t("SETTINGS.ACCOUNT.EMAIL_BOUND"));
          setShowEmailForm(false);
          form.reset(formDefaults(emailBindSchema));
          turnstileRef.current?.reset();
          setTurnstileToken(undefined);
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  }

  async function handleOAuthBind(provider: string) {
    const status = statusQuery.data;
    if (!status) return;
    analytics.settings.oauthBound(provider);
    setBindLoading(provider);
    try {
      const callbackUrl = `${window.location.origin}/api/auth/account/oauth/callback`;
      const state = handleElysia(
        await rpc.api.auth.account.oauth.state.get({
          query: { provider, redirect: callbackUrl, action: "bind" },
        }),
      );

      const url = buildOAuthAuthorizeUrl(provider, status, state);
      if (url) window.location.href = url;
    } finally {
      setBindLoading(null);
    }
  }

  async function handleOAuthUnbind(
    provider: "github" | "discord",
    label: string,
  ) {
    const ok = await confirm({
      title: t("SETTINGS.ACCOUNT.UNBIND_CONFIRM_TITLE", { provider: label }),
      description: t("SETTINGS.ACCOUNT.UNBIND_CONFIRM_DESCRIPTION", {
        provider: label,
      }),
      confirmLabel: t("SETTINGS.ACCOUNT.UNBIND"),
      cancelLabel: t("COMMON.CANCEL"),
      destructive: true,
    });
    if (!ok) return;
    unbindOAuthMutation.mutate(
      { bindingType: provider },
      {
        onSuccess: () => {
          analytics.settings.oauthUnbound(provider);
          toast.success(t("SETTINGS.ACCOUNT.UNBOUND", { provider: label }));
        },
      },
    );
  }

  function renderOAuthBinding(
    icon: React.ReactNode,
    label: string,
    boundId: string | undefined,
    idLabel: string,
    provider: "github" | "discord",
  ) {
    return (
      <div className="flex items-center justify-between rounded-md border p-3">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <span className="text-sm font-medium">{label}</span>
            <p className="text-muted-foreground text-xs">
              {boundId ? (
                <Tooltip>
                  <TooltipTrigger
                    onClick={() => {
                      void copyToClipboard(boundId);
                      toast.success(t("COMMON.COPIED_CLIPBOARD"));
                    }}
                    className="hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    {boundId}
                    <Icon name="copy" className="h-3 w-3" />
                  </TooltipTrigger>
                  <TooltipContent>{idLabel}</TooltipContent>
                </Tooltip>
              ) : (
                t("SETTINGS.ACCOUNT.NOT_BOUND")
              )}
            </p>
          </div>
        </div>
        {boundId ? (
          <Button
            variant="outline"
            size="sm"
            disabled={unbindOAuthMutation.isPending}
            onClick={() => handleOAuthUnbind(provider, label)}
          >
            {t("SETTINGS.ACCOUNT.UNBIND")}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={bindLoading !== null}
            onClick={() => handleOAuthBind(provider)}
          >
            {bindLoading === provider ? "..." : t("SETTINGS.ACCOUNT.BIND")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("SETTINGS.ACCOUNT.TITLE")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Icon name="mail" className="text-muted-foreground h-4 w-4" />
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
                        sendVerificationMutation.isPending ||
                        (turnstileEnabled && !turnstileToken)
                      }
                      onClick={handleSendCode}
                    >
                      {countdown > 0
                        ? `${countdown}s`
                        : t("SETTINGS.ACCOUNT.SEND_CODE")}
                    </Button>
                  </div>
                  {turnstileEnabled && turnstileSiteKey && (
                    <div className="flex justify-center">
                      <Turnstile
                        ref={turnstileRef}
                        siteKey={turnstileSiteKey}
                        onSuccess={setTurnstileToken}
                      />
                    </div>
                  )}
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
                      disabled={bindEmailMutation.isPending}
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
                        form.reset(formDefaults(emailBindSchema));
                        turnstileRef.current?.reset();
                        setTurnstileToken(undefined);
                      }}
                    >
                      {t("COMMON.CANCEL")}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          )}
        </div>

        <Separator />

        <div className="space-y-3">
          <Label>{t("SETTINGS.ACCOUNT.OAUTH_BINDINGS")}</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {renderOAuthBinding(
              <Icon name="github" className="h-5 w-5" />,
              t("SETTINGS.ACCOUNT.GITHUB"),
              user.github_id,
              "GitHub ID",
              "github",
            )}
            {renderOAuthBinding(
              <Icon name="brand-discord-si" className="h-5 w-5" />,
              t("SETTINGS.ACCOUNT.DISCORD"),
              user.discord_id,
              "Discord ID",
              "discord",
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
