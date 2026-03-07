"use client";

import { OAuthButtons } from "@/components/pages/auth/oauth-buttons";
import { TwoFAForm } from "@/components/pages/auth/twofa-form";
import { Button } from "@/components/ui/button";
import { GlassAuthCard } from "@/components/ui/glass-auth-card";
import { Input } from "@/components/ui/input";
import { useLoginMutation } from "@/hooks/auth-hook";
import { useStatusQuery } from "@/hooks/status-hook";
import { Link, useRouter } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { Turnstile } from "@marsidev/react-turnstile";
import { useTranslations } from "next-intl";
import { SyntheticEvent, useRef, useState } from "react";

export function LoginForm() {
  const t = useTranslations();
  const router = useRouter();
  const loginMutation = useLoginMutation();
  const statusQuery = useStatusQuery();
  const status = statusQuery.data;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show2FA, setShow2FA] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>();
  const turnstileRef = useRef<{ reset: () => void }>(null);

  async function handleSubmit(e: SyntheticEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    try {
      const data = await loginMutation.mutateAsync({
        username: username.trim(),
        password,
        turnstile: turnstileToken,
      });
      if (data && "require_2fa" in data && data.require_2fa) {
        setShow2FA(true);
        return;
      }

      router.push("/");
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
          router.push("/");
          router.refresh();
        }}
      />
    );
  }

  const showPasswordForm = (status as any)?.password_login_enabled !== false;

  return (
    <GlassAuthCard
      title={t("AUTH.LOGIN_TITLE")}
      description={t("AUTH.LOGIN_DESCRIPTION", APP_VALUES)}
    >
      <div className="space-y-6">
        {showPasswordForm && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-foreground text-sm font-medium">
                  {t("AUTH.USERNAME")}
                </label>
                <Input
                  type="text"
                  autoComplete="username"
                  placeholder={t("AUTH.USERNAME_PLACEHOLDER")}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="border-border/60 bg-background/60 h-11 rounded-2xl px-4"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-foreground text-sm font-medium">
                  {t("AUTH.PASSWORD")}
                </label>
                <Input
                  type="password"
                  autoComplete="current-password"
                  placeholder={t("AUTH.PASSWORD_PLACEHOLDER")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-border/60 bg-background/60 h-11 rounded-2xl px-4"
                />
              </div>
            </div>

            {status?.turnstile_check && status.turnstile_site_key && (
              <div className="flex justify-center">
                <Turnstile
                  ref={turnstileRef as any}
                  siteKey={status.turnstile_site_key}
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
                !username.trim() ||
                !password.trim() ||
                loginMutation.isPending ||
                (status?.turnstile_check && !turnstileToken)
              }
              className="h-11 w-full font-mono text-xs font-bold tracking-widest uppercase"
            >
              {loginMutation.isPending
                ? t("AUTH.LOGGING_IN")
                : t("AUTH.LOGIN_BUTTON")}
            </Button>
          </form>
        )}

        {status && <OAuthButtons status={status} />}

        <p className="text-muted-foreground text-center text-sm">
          {t("AUTH.DONT_HAVE_ACCOUNT")}{" "}
          <Link
            href="/register"
            className="text-foreground font-medium hover:underline"
          >
            {t("AUTH.REGISTER_BUTTON")}
          </Link>
        </p>
      </div>
    </GlassAuthCard>
  );
}
