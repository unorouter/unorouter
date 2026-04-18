"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { OAuthButtons } from "@/components/pages/auth/oauth-buttons";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { GlassAuthCard } from "@/components/ui/glass-auth-card";
import {
  useRegisterMutation,
  useSendVerificationMutation,
} from "@/hooks/auth-hook";
import { useStatusQuery } from "@/hooks/status-hook";
import { Link, useRouter } from "@/i18n/navigation";
import { analytics } from "@/lib/analytics";
import { AFF_CODE_KEY, APP_VALUES } from "@/lib/config/constants";
import {
  registerChecker,
  registerSchema,
  type RegisterSchema,
} from "@/lib/validation/auth";
import { safeParse } from "@/lib/validation/helpers";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Value } from "@sinclair/typebox/value";
import { deleteCookie, getCookie } from "cookies-next/client";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

const RESEND_COOLDOWN_SECONDS = 60;

export function RegisterForm() {
  const t = useTranslations();
  const router = useRouter();
  const registerMutation = useRegisterMutation();
  const verificationMutation = useSendVerificationMutation();
  const statusQuery = useStatusQuery();
  const status = statusQuery.data;

  const form = useForm({
    resolver: typeboxResolver(registerSchema),
    defaultValues: Value.Default(registerSchema, {}) as RegisterSchema,
  });

  const [turnstileToken, setTurnstileToken] = useState<string | undefined>();
  const turnstileRef = useRef<TurnstileInstance>(null);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const id = setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendSeconds]);

  async function handleSendCode() {
    const email = form.getValues("email");
    if (!email?.trim()) return;
    await verificationMutation.mutateAsync({
      query: {
        email: email.trim(),
        turnstile: turnstileToken,
      },
    });
    analytics.auth.verificationSent();
    turnstileRef.current?.reset();
    setTurnstileToken(undefined);
    setResendSeconds(RESEND_COOLDOWN_SECONDS);
  }

  async function onSubmit(data: RegisterSchema) {
    try {
      const affCode = (getCookie(AFF_CODE_KEY) as string) || undefined;
      const email = data.email?.trim() || undefined;
      const username = status?.email_verification
        ? (email ?? "")
        : data.username.trim();
      await registerMutation.mutateAsync({
        body: {
          username,
          password: data.password,
          email,
          verification_code: data.verification_code?.trim() || undefined,
          aff_code: affCode,
          turnstile: turnstileToken,
        },
      });
      analytics.auth.registerCompleted();
      deleteCookie(AFF_CODE_KEY);
      router.push("/login");
    } catch {
      turnstileRef.current?.reset();
      setTurnstileToken(undefined);
    }
  }

  const showPasswordForm = status?.password_register_enabled !== false;
  const emailAsUsername = status?.email_verification === true;

  // eslint-disable-next-line react-hooks/incompatible-library
  const formValues = form.watch();
  const isValid = safeParse(registerChecker, {
    username: emailAsUsername
      ? formValues.email?.trim() || ""
      : formValues.username,
    password: formValues.password,
  }).success;

  return (
    <GlassAuthCard
      title={t("AUTH.REGISTER.TITLE")}
      description={t("AUTH.REGISTER.DESCRIPTION", APP_VALUES)}
    >
      <div className="space-y-6">
        {showPasswordForm && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-3">
                {!emailAsUsername && (
                  <MyFormInput
                    control={form.control}
                    name="username"
                    schema={registerSchema}
                    label={t("AUTH.FORM.USERNAME")}
                    type="text"
                    autoComplete="username"
                    placeholder={t("AUTH.FORM.USERNAME_PLACEHOLDER")}
                    className="border-border/60 bg-background/60 h-11 rounded-2xl px-4"
                  />
                )}

                {status?.email_verification && (
                  <div className="space-y-1.5">
                    <MyFormInput
                      control={form.control}
                      name="email"
                      schema={registerSchema}
                      label={t("AUTH.FORM.EMAIL")}
                      type="email"
                      autoComplete="email"
                      placeholder={t("AUTH.FORM.EMAIL_PLACEHOLDER")}
                      className="border-border/60 bg-background/60 h-11 rounded-2xl px-4"
                    />
                    {verificationMutation.error && (
                      <p className="text-destructive text-xs font-medium">
                        {t("AUTH.VERIFICATION.FAILED")}
                      </p>
                    )}
                  </div>
                )}

                <MyFormInput
                  control={form.control}
                  name="password"
                  schema={registerSchema}
                  label={t("AUTH.FORM.PASSWORD")}
                  type="password"
                  autoComplete="new-password"
                  placeholder={t("AUTH.FORM.PASSWORD_PLACEHOLDER")}
                  className="border-border/60 bg-background/60 h-11 rounded-2xl px-4"
                />

                {status?.email_verification && (
                  <div className="space-y-1.5">
                    <label className="text-foreground text-sm font-medium">
                      {t("AUTH.FORM.VERIFICATION_CODE")}
                    </label>
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <MyFormInput
                          control={form.control}
                          name="verification_code"
                          schema={registerSchema}
                          type="text"
                          inputMode="numeric"
                          placeholder={t(
                            "AUTH.FORM.VERIFICATION_CODE_PLACEHOLDER",
                          )}
                          className="border-border/60 bg-background/60 h-11 rounded-2xl px-4"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSendCode}
                        disabled={
                          !formValues.email?.trim() ||
                          verificationMutation.isPending ||
                          resendSeconds > 0
                        }
                        className="h-11 shrink-0 rounded-2xl px-4 text-xs"
                      >
                        {verificationMutation.isPending
                          ? t("AUTH.VERIFICATION.SENDING")
                          : resendSeconds > 0
                            ? t("AUTH.VERIFICATION.RESEND_IN", {
                                seconds: resendSeconds,
                              })
                            : verificationMutation.isSuccess
                              ? t("AUTH.VERIFICATION.RESEND")
                              : t("AUTH.VERIFICATION.SEND_CODE")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {status?.turnstile_check && status.turnstile_site_key && (
                <div className="flex justify-center">
                  <Turnstile
                    ref={turnstileRef}
                    siteKey={status.turnstile_site_key}
                    onSuccess={setTurnstileToken}
                  />
                </div>
              )}

              {registerMutation.error && (
                <p className="text-destructive text-center text-xs font-medium">
                  {registerMutation.error.message}
                </p>
              )}

              <Button
                type="submit"
                disabled={
                  !isValid ||
                  registerMutation.isPending ||
                  (status?.turnstile_check && !turnstileToken) ||
                  (status?.email_verification &&
                    !formValues.verification_code?.trim())
                }
                className="h-11 w-full font-mono text-xs font-bold tracking-widest uppercase"
              >
                {registerMutation.isPending
                  ? t("AUTH.REGISTERING")
                  : t("AUTH.REGISTER.BUTTON")}
              </Button>
            </form>
          </Form>
        )}

        {status && <OAuthButtons status={status} />}

        <p className="text-muted-foreground text-center text-sm">
          {t("AUTH.ALREADY_HAVE_ACCOUNT")}{" "}
          <Link
            href="/login"
            className="text-foreground font-medium hover:underline"
          >
            {t("AUTH.LOGIN.BUTTON")}
          </Link>
        </p>
      </div>
    </GlassAuthCard>
  );
}
