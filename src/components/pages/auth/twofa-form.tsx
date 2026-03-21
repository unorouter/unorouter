"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useVerify2FAMutation } from "@/hooks/auth-hook";
import { twoFAChecker, twoFASchema, type TwoFASchema } from "@/lib/validation/auth";
import { safeParse } from "@/lib/validation/helpers";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { Value } from "@sinclair/typebox/value";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

interface TwoFAFormProps {
  onSuccess: () => void;
}

export function TwoFAForm(props: TwoFAFormProps) {
  const t = useTranslations();
  const verify2FA = useVerify2FAMutation();

  const form = useForm<TwoFASchema>({
    resolver: typeboxResolver(twoFASchema),
    defaultValues: Value.Default(twoFASchema, {}) as TwoFASchema,
  });

  async function onSubmit(data: TwoFASchema) {
    try {
      await verify2FA.mutateAsync(data.code.trim());
      props.onSuccess();
    } catch {
      // error handled by mutation
    }
  }

  const formValues = form.watch();
  const isValid = safeParse(twoFAChecker, { code: formValues.code }).success;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-foreground text-xl font-semibold">
            {t("AUTH.TWO_FA_TITLE")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t("AUTH.TWO_FA_DESCRIPTION")}
          </p>
        </div>

        <div className="space-y-4">
          <MyFormInput
            control={form.control}
            name="code"
            schema={twoFASchema}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder={t("AUTH.TWO_FA_CODE_PLACEHOLDER")}
            className="border-border/60 bg-background/60 h-11 rounded-2xl text-center text-lg tracking-[0.5em]"
            maxLength={6}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/\D/g, "").slice(0, 6);
              form.setValue("code", cleaned);
            }}
          />

          {verify2FA.error && (
            <p className="text-destructive text-center text-xs font-medium">
              {verify2FA.error.message}
            </p>
          )}

          <Button
            type="submit"
            disabled={!isValid || verify2FA.isPending}
            className="h-11 w-full font-mono text-xs font-bold tracking-widest uppercase"
          >
            {verify2FA.isPending
              ? t("AUTH.TWO_FA_VERIFYING")
              : t("AUTH.TWO_FA_SUBMIT")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
