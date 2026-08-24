"use client";

import { CopyButton } from "@/components/elements/code/copy-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { GlassAuthCard } from "@/components/ui/glass-auth-card";
import { useResetPasswordMutation } from "@/hooks/auth/auth-hook";
import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useState } from "react";

type Props = {
  email?: string;
  token?: string;
};

export function ResetPasswordForm(props: Props) {
  const t = useTranslations();
  const resetMutation = useResetPasswordMutation();
  const [password, setPassword] = useState<string | null>(null);

  async function onConfirm() {
    if (!props.email || !props.token) return;
    // Upstream GENERATES the password and returns it; it never accepts one.
    const result = await resetMutation.mutateAsync({
      body: { email: props.email, token: props.token },
    });
    if (typeof result === "string") setPassword(result);
  }

  if (!props.email || !props.token) {
    return (
      <GlassAuthCard
        title={t("AUTH.RESET_PASSWORD.TITLE")}
        description={t("AUTH.RESET_PASSWORD.INVALID_LINK")}
      >
        <p className="text-muted-foreground text-center text-sm">
          <Link
            href="/forgot-password"
            className="text-foreground font-medium hover:underline"
          >
            {t("AUTH.RESET_PASSWORD.REQUEST_NEW_LINK")}
          </Link>
        </p>
      </GlassAuthCard>
    );
  }

  return (
    <GlassAuthCard
      title={t("AUTH.RESET_PASSWORD.TITLE")}
      description={t("AUTH.RESET_PASSWORD.DESCRIPTION", APP_VALUES)}
    >
      <div className="space-y-6">
        {password ? (
          <div className="space-y-4">
            <p className="text-muted-foreground text-center text-sm">
              {t("AUTH.RESET_PASSWORD.SAVE_PASSWORD")}
            </p>
            <div className="border-border/60 bg-background/60 flex items-center justify-between gap-2 rounded-2xl border px-4 py-3">
              <code className="font-mono text-sm break-all">{password}</code>
              <CopyButton text={password} />
            </div>
            <Link
              href="/login"
              className={cn(
                buttonVariants(),
                "h-11 w-full font-mono text-xs font-bold tracking-widest uppercase",
              )}
            >
              {t("AUTH.RESET_PASSWORD.GO_TO_LOGIN")}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-muted-foreground text-center text-sm">
              {props.email}
            </p>

            {resetMutation.error && (
              <p className="text-destructive text-center text-xs font-medium">
                {resetMutation.error.message}
              </p>
            )}

            <Button
              onClick={onConfirm}
              disabled={resetMutation.isPending}
              className="h-11 w-full font-mono text-xs font-bold tracking-widest uppercase"
            >
              {resetMutation.isPending
                ? t("AUTH.RESET_PASSWORD.RESETTING")
                : t("AUTH.RESET_PASSWORD.BUTTON")}
            </Button>
          </div>
        )}
      </div>
    </GlassAuthCard>
  );
}
