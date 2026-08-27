"use client";

import { Button } from "@/components/ui/button";
import { GlassAuthCard } from "@/components/ui/glass-auth-card";
import { Input } from "@/components/ui/input";
import { useVerify2FAMutation } from "@/hooks/auth/auth-hook";
import { analytics } from "@/lib/analytics";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

interface TwoFAFormProps {
  flowToken?: string;
  onSuccess: () => void;
}

export function TwoFAForm(props: TwoFAFormProps) {
  const t = useTranslations();
  const verify2FA = useVerify2FAMutation();
  const [code, setCode] = useState("");

  // A double submit reuses a consumed flow_token, which surfaces as a wrong-code error.
  const submitting = useRef(false);

  async function onSubmit(value: string) {
    if (submitting.current || verify2FA.isPending) {
      logChatDebug("auth.2fa_submit_skipped", { reason: "already-in-flight" });
      return;
    }
    submitting.current = true;
    logChatDebug("auth.2fa_submit", {
      codeLen: value.trim().length,
      hasFlowToken: !!props.flowToken,
    });
    try {
      await verify2FA.mutateAsync({
        body: { code: value.trim(), flow_token: props.flowToken },
      });
      logChatDebug("auth.2fa_verified", {});
      analytics.auth.twoFAVerified();
      props.onSuccess();
    } catch (e) {
      logChatDebug("auth.2fa_failed", {
        error: String(e instanceof Error ? e.message : e).slice(0, 200),
      });
      setCode("");
    } finally {
      submitting.current = false;
    }
  }

  // Plain input on purpose: the segmented input-otp widget paints an invisible
  // input under decorative slots, and password managers cannot fill it
  // (guilhermerodz/input-otp#92, open, no upstream fix). Extensions fill a real
  // visible input reliably.
  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6) void onSubmit(digits);
  }

  return (
    <GlassAuthCard
      title={t("AUTH.TWO_FA.TITLE")}
      description={t("AUTH.TWO_FA.DESCRIPTION")}
    >
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(code);
        }}
      >
        <div className="flex justify-center">
          <Input
            name="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => handleChange(e.target.value)}
            disabled={verify2FA.isPending}
            autoFocus
            placeholder="000000"
            aria-label={t("AUTH.TWO_FA.TITLE")}
            className="h-14 max-w-56 text-center font-mono text-2xl tracking-[0.6em]"
          />
        </div>

        {verify2FA.error && (
          <p className="text-destructive text-center text-xs font-medium">
            {verify2FA.error.message}
          </p>
        )}

        <Button
          type="submit"
          disabled={code.length !== 6 || verify2FA.isPending}
          className="h-11 w-full font-mono text-xs font-bold tracking-widest uppercase"
        >
          {verify2FA.isPending
            ? t("AUTH.TWO_FA.VERIFYING")
            : t("AUTH.TWO_FA.SUBMIT")}
        </Button>
      </form>
    </GlassAuthCard>
  );
}
