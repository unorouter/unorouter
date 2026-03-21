"use client";

import { OAuthButtons } from "@/components/pages/auth/oauth-buttons";
import { Button } from "@/components/ui/button";
import { GlassAuthCard } from "@/components/ui/glass-auth-card";
import { Input } from "@/components/ui/input";
import { useRegisterMutation, useSendVerificationMutation } from "@/hooks/auth-hook";
import { useStatusQuery } from "@/hooks/status-hook";
import { Link, useRouter } from "@/i18n/navigation";
import { AFF_CODE_KEY, APP_VALUES } from "@/lib/config/constants";
import { Turnstile } from "@marsidev/react-turnstile";
import { deleteCookie, getCookie } from "cookies-next/client";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

export function RegisterForm() {
  const t = useTranslations();
  const router = useRouter();
  const registerMutation = useRegisterMutation();
  const verificationMutation = useSendVerificationMutation();
  const statusQuery = useStatusQuery();
  const status = statusQuery.data;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>();
  const turnstileRef = useRef<{ reset: () => void }>(null);

  async function handleSendCode() {
    if (!email.trim()) return;
    await verificationMutation.mutateAsync({ email: email.trim(), turnstile: turnstileToken });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    try {
      const affCode = (getCookie(AFF_CODE_KEY) as string) || undefined;
      await registerMutation.mutateAsync({
        username: username.trim(),
        password,
        email: email.trim() || undefined,
        verification_code: verificationCode.trim() || undefined,
        aff_code: affCode,
        turnstile: turnstileToken,
      });
      deleteCookie(AFF_CODE_KEY);
      router.push("/login");
    } catch {
      turnstileRef.current?.reset();
      setTurnstileToken(undefined);
    }
  }

  const showPasswordForm = status?.password_register_enabled !== false;

  return (
    <GlassAuthCard
      title={t("AUTH.REGISTER_TITLE")}
      description={t("AUTH.REGISTER_DESCRIPTION", APP_VALUES)}
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
                  autoComplete="new-password"
                  placeholder={t("AUTH.PASSWORD_PLACEHOLDER")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-border/60 bg-background/60 h-11 rounded-2xl px-4"
                />
                {password.length > 0 && password.length < 8 && (
                  <p className="text-muted-foreground text-xs">
                    {t("AUTH.PASSWORD_MIN_LENGTH")}
                  </p>
                )}
              </div>

              {status?.email_verification && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-foreground text-sm font-medium">
                      {t("AUTH.EMAIL")}
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder={t("AUTH.EMAIL_PLACEHOLDER")}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="border-border/60 bg-background/60 h-11 rounded-2xl px-4"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSendCode}
                        disabled={!email.trim() || verificationMutation.isPending || verificationMutation.isSuccess}
                        className="h-11 shrink-0 rounded-2xl px-4 text-xs"
                      >
                        {verificationMutation.isPending
                          ? t("AUTH.SENDING_CODE")
                          : verificationMutation.isSuccess
                            ? t("AUTH.CODE_SENT")
                            : t("AUTH.SEND_CODE")}
                      </Button>
                    </div>
                    {verificationMutation.error && (
                      <p className="text-destructive text-xs font-medium">
                        {t("AUTH.SEND_CODE_FAILED")}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-foreground text-sm font-medium">
                      {t("AUTH.VERIFICATION_CODE")}
                    </label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder={t("AUTH.VERIFICATION_CODE_PLACEHOLDER")}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="border-border/60 bg-background/60 h-11 rounded-2xl px-4"
                    />
                  </div>
                </>
              )}
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

            {registerMutation.error && (
              <p className="text-destructive text-center text-xs font-medium">
                {registerMutation.error.message}
              </p>
            )}

            <Button
              type="submit"
              disabled={
                !username.trim() ||
                password.trim().length < 8 ||
                registerMutation.isPending ||
                (status?.turnstile_check && !turnstileToken) ||
                (status?.email_verification && !verificationCode.trim())
              }
              className="h-11 w-full font-mono text-xs font-bold tracking-widest uppercase"
            >
              {registerMutation.isPending
                ? t("AUTH.REGISTERING")
                : t("AUTH.REGISTER_BUTTON")}
            </Button>
          </form>
        )}

        {status && <OAuthButtons status={status} />}

        <p className="text-muted-foreground text-center text-sm">
          {t("AUTH.ALREADY_HAVE_ACCOUNT")}{" "}
          <Link
            href="/login"
            className="text-foreground font-medium hover:underline"
          >
            {t("AUTH.LOGIN_BUTTON")}
          </Link>
        </p>
      </div>
    </GlassAuthCard>
  );
}
