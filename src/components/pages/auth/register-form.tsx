"use client";

import { OAuthButtons } from "@/components/pages/auth/oauth-buttons";
import { Button } from "@/components/ui/button";
import { GlassAuthCard } from "@/components/ui/glass-auth-card";
import { Input } from "@/components/ui/input";
import { useRegisterMutation } from "@/hooks/auth-hook";
import { useStatusQuery } from "@/hooks/status-hook";
import { Link, useRouter } from "@/i18n/navigation";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils";
import { Turnstile } from "@marsidev/react-turnstile";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

export function RegisterForm() {
  const t = useTranslations();
  const router = useRouter();
  const registerMutation = useRegisterMutation();
  const statusQuery = useStatusQuery();
  const status = statusQuery.data;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>();
  const turnstileRef = useRef<{ reset: () => void }>(null);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [codeError, setCodeError] = useState("");

  async function handleSendCode() {
    if (!email.trim()) return;
    setSendingCode(true);
    setCodeError("");
    try {
      handleElysia(
        await rpc.api.auth.verification.get({ query: { email: email.trim() } }),
      );
      setCodeSent(true);
    } catch {
      setCodeError(t("AUTH.SEND_CODE_FAILED"));
    } finally {
      setSendingCode(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    try {
      await registerMutation.mutateAsync({
        username: username.trim(),
        password,
        email: email.trim() || undefined,
        verification_code: verificationCode.trim() || undefined,
        turnstile: turnstileToken,
      });
      router.push("/login");
    } catch {
      turnstileRef.current?.reset();
      setTurnstileToken(undefined);
    }
  }

  const showPasswordForm =
    (status as any)?.password_register_enabled !== false;

  return (
    <GlassAuthCard
      title={t("AUTH.REGISTER_TITLE")}
      description={t("AUTH.REGISTER_DESCRIPTION")}
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
                      disabled={!email.trim() || sendingCode || codeSent}
                      className="h-11 shrink-0 rounded-2xl px-4 text-xs"
                    >
                      {sendingCode
                        ? t("AUTH.SENDING_CODE")
                        : codeSent
                          ? t("AUTH.CODE_SENT")
                          : t("AUTH.SEND_CODE")}
                    </Button>
                  </div>
                  {codeError && (
                    <p className="text-destructive text-xs font-medium">
                      {codeError}
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
              !password.trim() ||
              registerMutation.isPending ||
              (status?.turnstile_check && !turnstileToken) ||
              (status?.email_verification && !verificationCode.trim())
            }
            className="h-11 w-full rounded-full font-medium"
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
