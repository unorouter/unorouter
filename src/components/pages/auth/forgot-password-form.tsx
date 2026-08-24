"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { GlassAuthCard } from "@/components/ui/glass-auth-card";
import { useSendPasswordResetMutation } from "@/hooks/auth/auth-hook";
import { useStatusQuery } from "@/hooks/ops/status-hook";
import { Link } from "@/i18n/navigation";
import { APP_VALUES, RESEND_COOLDOWN_SECONDS } from "@/lib/config/constants";
import {
  forgotPasswordChecker,
  forgotPasswordSchema,
  type ForgotPasswordSchema,
} from "@/lib/validation/auth";
import { formDefaults, safeParse } from "@/lib/validation/helpers";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

export function ForgotPasswordForm() {
  const t = useTranslations();
  const statusQuery = useStatusQuery();
  const resetMutation = useSendPasswordResetMutation();

  const form = useForm({
    resolver: typeboxResolver(forgotPasswordSchema),
    defaultValues: formDefaults(forgotPasswordSchema),
  });

  const [turnstileToken, setTurnstileToken] = useState<string | undefined>();
  const turnstileRef = useRef<TurnstileInstance>(null);
  const [sent, setSent] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  const email = useWatch({ control: form.control, name: "email" });
  const isValid = safeParse(forgotPasswordChecker, { email }).success;

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const id = setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendSeconds]);

  async function onSubmit(data: ForgotPasswordSchema) {
    try {
      await resetMutation.mutateAsync({
        query: { email: data.email.trim(), turnstile: turnstileToken },
      });
      setSent(true);
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
    } finally {
      turnstileRef.current?.reset();
      setTurnstileToken(undefined);
    }
  }

  return (
    <GlassAuthCard
      title={t("AUTH.FORGOT_PASSWORD.TITLE")}
      description={t("AUTH.FORGOT_PASSWORD.DESCRIPTION", APP_VALUES)}
    >
      <div className="space-y-6">
        {sent ? (
          // Upstream answers identically for unregistered addresses; this copy
          // must not imply an account was found.
          <p className="text-muted-foreground text-center text-sm">
            {t("AUTH.FORGOT_PASSWORD.SENT")}
          </p>
        ) : (
          <Form {...form}>
            <form
              onSubmit={(e) => {
                form.handleSubmit(onSubmit)(e);
              }}
              className="space-y-4"
            >
              <MyFormInput
                control={form.control}
                name="email"
                schema={forgotPasswordSchema}
                label={t("AUTH.FORM.EMAIL")}
                type="email"
                autoComplete="email"
                placeholder={t("AUTH.FORM.EMAIL_PLACEHOLDER")}
                className="border-border/60 bg-background/60 h-11 rounded-2xl px-4"
              />

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

              {resetMutation.error && (
                <p className="text-destructive text-center text-xs font-medium">
                  {resetMutation.error.message}
                </p>
              )}

              <Button
                type="submit"
                disabled={
                  !isValid ||
                  resendSeconds > 0 ||
                  resetMutation.isPending ||
                  (statusQuery.data?.turnstile_check && !turnstileToken)
                }
                className="h-11 w-full font-mono text-xs font-bold tracking-widest uppercase"
              >
                {resetMutation.isPending
                  ? t("AUTH.FORGOT_PASSWORD.SENDING")
                  : t("AUTH.FORGOT_PASSWORD.BUTTON")}
              </Button>
            </form>
          </Form>
        )}

        <p className="text-muted-foreground text-center text-sm">
          <Link
            href="/login"
            className="text-foreground font-medium hover:underline"
          >
            {t("AUTH.FORGOT_PASSWORD.BACK_TO_LOGIN")}
          </Link>
        </p>
      </div>
    </GlassAuthCard>
  );
}
