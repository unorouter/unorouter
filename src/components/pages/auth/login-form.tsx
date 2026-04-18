"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { OAuthButtons } from "@/components/pages/auth/oauth-buttons";
import { TwoFAForm } from "@/components/pages/auth/twofa-form";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { GlassAuthCard } from "@/components/ui/glass-auth-card";
import { useLoginMutation } from "@/hooks/auth-hook";
import { useStatusQuery } from "@/hooks/status-hook";
import { Link, useRouter } from "@/i18n/navigation";
import { RouterPush } from "@/i18n/routing";
import { APP_VALUES, AUTH_REDIRECT_COOKIE } from "@/lib/config/constants";
import {
  loginChecker,
  loginSchema,
  type LoginSchema,
} from "@/lib/validation/auth";
import { analytics } from "@/lib/analytics";
import { safeParse } from "@/lib/validation/helpers";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Value } from "@sinclair/typebox/value";
import { deleteCookie, getCookie } from "cookies-next/client";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";

export function LoginForm() {
  const t = useTranslations();
  const router = useRouter();
  const loginMutation = useLoginMutation();
  const statusQuery = useStatusQuery();

  const form = useForm({
    resolver: typeboxResolver(loginSchema),
    defaultValues: Value.Default(loginSchema, {}) as LoginSchema,
  });

  const [show2FA, setShow2FA] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>();
  const turnstileRef = useRef<TurnstileInstance>(null);

  function getRedirectPath() {
    const redirect = getCookie(AUTH_REDIRECT_COOKIE);
    if (redirect) deleteCookie(AUTH_REDIRECT_COOKIE);
    return (redirect as string) || "/dashboard";
  }

  async function onSubmit(data: LoginSchema) {
    try {
      const result = await loginMutation.mutateAsync({
        body: {
          username: data.username.trim(),
          password: data.password,
          turnstile: turnstileToken,
        },
      });
      if (result && "require_2fa" in result && result.require_2fa) {
        setShow2FA(true);
        return;
      }

      analytics.auth.loginCompleted("email");
      router.push(getRedirectPath() as RouterPush);
      router.refresh();
    } catch {
      turnstileRef.current?.reset();
      setTurnstileToken(undefined);
    }
  }

  if (show2FA) {
    return (
      <TwoFAForm
        onSuccess={() => {
          router.push(getRedirectPath() as RouterPush);
          router.refresh();
        }}
      />
    );
  }

  const showPasswordForm = statusQuery.data?.password_login_enabled !== false;
  const emailAsUsername = statusQuery.data?.email_verification === true;

  const formValues = form.watch();
  const isValid = safeParse(loginChecker, {
    username: formValues.username,
    password: formValues.password,
  }).success;

  return (
    <GlassAuthCard
      title={t("AUTH.LOGIN.TITLE")}
      description={t("AUTH.LOGIN.DESCRIPTION", APP_VALUES)}
    >
      <div className="space-y-6">
        {showPasswordForm && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-3">
                <MyFormInput
                  control={form.control}
                  name="username"
                  schema={loginSchema}
                  label={
                    emailAsUsername
                      ? t("AUTH.FORM.USERNAME_OR_EMAIL")
                      : t("AUTH.FORM.USERNAME")
                  }
                  type="text"
                  autoComplete="username"
                  placeholder={
                    emailAsUsername
                      ? t("AUTH.FORM.USERNAME_OR_EMAIL_PLACEHOLDER")
                      : t("AUTH.FORM.USERNAME_PLACEHOLDER")
                  }
                  className="border-border/60 bg-background/60 h-11 rounded-2xl px-4"
                />
                <MyFormInput
                  control={form.control}
                  name="password"
                  schema={loginSchema}
                  label={t("AUTH.FORM.PASSWORD")}
                  type="password"
                  autoComplete="current-password"
                  placeholder={t("AUTH.FORM.PASSWORD_PLACEHOLDER")}
                  className="border-border/60 bg-background/60 h-11 rounded-2xl px-4"
                />
              </div>

              {statusQuery.data?.turnstile_check &&
                statusQuery.data.turnstile_site_key && (
                  <div className="flex justify-center">
                    <Turnstile
                      ref={turnstileRef}
                      siteKey={statusQuery.data.turnstile_site_key}
                      onSuccess={setTurnstileToken}
                    />
                  </div>
                )}

              {loginMutation.error && (
                <p className="text-destructive text-center text-xs font-medium">
                  {loginMutation.error.message}
                </p>
              )}

              <Button
                type="submit"
                disabled={
                  !isValid ||
                  loginMutation.isPending ||
                  (statusQuery.data?.turnstile_check && !turnstileToken)
                }
                className="h-11 w-full font-mono text-xs font-bold tracking-widest uppercase"
              >
                {loginMutation.isPending
                  ? t("AUTH.LOGGING_IN")
                  : t("AUTH.LOGIN.BUTTON")}
              </Button>
            </form>
          </Form>
        )}

        {statusQuery.data && <OAuthButtons status={statusQuery.data} />}

        <p className="text-muted-foreground text-center text-sm">
          {t("AUTH.DONT_HAVE_ACCOUNT")}{" "}
          <Link
            href="/register"
            className="text-foreground font-medium hover:underline"
          >
            {t("AUTH.REGISTER.BUTTON")}
          </Link>
        </p>
      </div>
    </GlassAuthCard>
  );
}
