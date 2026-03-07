"use client";

import { useVerify2FAMutation } from "@/hooks/auth-hook";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface TwoFAFormProps {
  onSuccess: () => void;
}

export function TwoFAForm(props: TwoFAFormProps) {
  const t = useTranslations();
  const [code, setCode] = useState("");
  const verify2FA = useVerify2FAMutation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    try {
      await verify2FA.mutateAsync(code.trim());
      props.onSuccess();
    } catch {
      // error handled by mutation
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-foreground text-xl font-semibold">
          {t("AUTH.TWO_FA_TITLE")}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t("AUTH.TWO_FA_DESCRIPTION")}
        </p>
      </div>

      <div className="space-y-4">
        <Input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder={t("AUTH.TWO_FA_CODE_PLACEHOLDER")}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="border-border/60 bg-background/60 h-11 rounded-2xl text-center text-lg tracking-[0.5em]"
          maxLength={6}
        />

        {verify2FA.error && (
          <p className="text-destructive text-center text-xs font-medium">
            {verify2FA.error.message}
          </p>
        )}

        <Button
          type="submit"
          disabled={code.length < 6 || verify2FA.isPending}
          className="h-11 w-full font-mono text-xs font-bold tracking-widest uppercase"
        >
          {verify2FA.isPending
            ? t("AUTH.TWO_FA_VERIFYING")
            : t("AUTH.TWO_FA_SUBMIT")}
        </Button>
      </div>
    </form>
  );
}
