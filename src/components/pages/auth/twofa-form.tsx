"use client";

import { Button } from "@/components/ui/button";
import { GlassAuthCard } from "@/components/ui/glass-auth-card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useVerify2FAMutation } from "@/hooks/auth/auth-hook";
import { analytics } from "@/lib/analytics";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface TwoFAFormProps {
  flowToken?: string;
  onSuccess: () => void;
}

export function TwoFAForm(props: TwoFAFormProps) {
  const t = useTranslations();
  const verify2FA = useVerify2FAMutation();
  const [code, setCode] = useState("");

  async function onSubmit(value: string) {
    try {
      await verify2FA.mutateAsync({
        body: { code: value.trim(), flow_token: props.flowToken },
      });
      analytics.auth.twoFAVerified();
      props.onSuccess();
    } catch {
      setCode("");
    }
  }

  return (
    <GlassAuthCard
      title={t("AUTH.TWO_FA.TITLE")}
      description={t("AUTH.TWO_FA.DESCRIPTION")}
    >
      <div className="space-y-6">
        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            pattern={REGEXP_ONLY_DIGITS}
            value={code}
            onChange={setCode}
            onComplete={onSubmit}
            disabled={verify2FA.isPending}
            autoFocus
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        {verify2FA.error && (
          <p className="text-destructive text-center text-xs font-medium">
            {verify2FA.error.message}
          </p>
        )}

        <Button
          type="button"
          disabled={code.length !== 6 || verify2FA.isPending}
          onClick={() => onSubmit(code)}
          className="h-11 w-full font-mono text-xs font-bold tracking-widest uppercase"
        >
          {verify2FA.isPending
            ? t("AUTH.TWO_FA.VERIFYING")
            : t("AUTH.TWO_FA.SUBMIT")}
        </Button>
      </div>
    </GlassAuthCard>
  );
}
