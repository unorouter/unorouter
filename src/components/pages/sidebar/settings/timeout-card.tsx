"use client";

import { MyFormInput } from "@/components/elements/form/my-form-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { useUpdateTimeoutMutation } from "@/hooks/auth/settings-hook";
import { safeJsonParse } from "@/lib/utils/base";
import {
  timeoutSettingSchema,
  type TimeoutSettingSchema,
} from "@/lib/validation/settings";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { formDefaults } from "@/lib/validation/helpers";

type ServerSetting = {
  max_first_token_seconds?: number;
  max_chain_first_token_seconds?: number;
};

export function TimeoutCard() {
  const t = useTranslations();
  const authQuery = useAuthQuery();
  const updateTimeoutMutation = useUpdateTimeoutMutation();
  const user = authQuery.data;

  const form = useForm({
    resolver: typeboxResolver(timeoutSettingSchema),
    defaultValues: formDefaults(timeoutSettingSchema),
  });

  const timeoutEnabled = form.watch("timeout_enabled");

  useEffect(() => {
    if (!user?.setting) return;
    const s = safeJsonParse<Partial<ServerSetting>>(user.setting, {});
    const perAttempt = s.max_first_token_seconds ?? 0;
    form.reset({
      timeout_enabled: perAttempt > 0,
      max_first_token_seconds: perAttempt > 0 ? perAttempt : 60,
      max_chain_first_token_seconds: s.max_chain_first_token_seconds ?? 0,
    });
  }, [user?.setting, form]);

  function onSubmit(data: TimeoutSettingSchema) {
    updateTimeoutMutation.mutate(
      {
        body: {
          max_first_token_seconds: data.timeout_enabled
            ? Math.round(data.max_first_token_seconds)
            : 0,
          max_chain_first_token_seconds: data.timeout_enabled
            ? Math.round(data.max_chain_first_token_seconds)
            : 0,
        },
      },
      {
        onSuccess: () => toast.success(t("SETTINGS.TIMEOUT.SETTINGS_SAVED")),
        onError: (error) => toast.error(error.message),
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("SETTINGS.TIMEOUT.TITLE")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="timeout_enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <FormLabel>{t("SETTINGS.TIMEOUT.ENABLED")}</FormLabel>
                    <FormDescription className="text-muted-foreground text-xs">
                      {t("SETTINGS.TIMEOUT.ENABLED_DESC")}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {timeoutEnabled && (
              <>
                <div className="space-y-1">
                  <MyFormInput
                    control={form.control}
                    name="max_first_token_seconds"
                    schema={timeoutSettingSchema}
                    label={t("SETTINGS.TIMEOUT.PER_ATTEMPT")}
                    type="number"
                    min="5"
                    max="600"
                    className="w-32"
                  />
                  <p className="text-muted-foreground text-xs">
                    {t("SETTINGS.TIMEOUT.PER_ATTEMPT_DESC")}
                  </p>
                </div>

                <div className="space-y-1">
                  <MyFormInput
                    control={form.control}
                    name="max_chain_first_token_seconds"
                    schema={timeoutSettingSchema}
                    label={t("SETTINGS.TIMEOUT.WHOLE_CHAIN")}
                    type="number"
                    min="0"
                    max="600"
                    className="w-32"
                  />
                  <p className="text-muted-foreground text-xs">
                    {t("SETTINGS.TIMEOUT.WHOLE_CHAIN_DESC")}
                  </p>
                </div>

                <p className="text-muted-foreground border-border/40 rounded-md border p-3 text-xs">
                  {t("SETTINGS.TIMEOUT.STREAMING_NOTE")}
                </p>
              </>
            )}

            <Button type="submit" disabled={updateTimeoutMutation.isPending}>
              {t("SETTINGS.TIMEOUT.SAVE_SETTINGS")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
