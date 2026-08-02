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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { useUpdateSettingMutation } from "@/hooks/auth/settings-hook";
import { analytics } from "@/lib/analytics";
import { dollarsToQuota, quotaToDollars } from "@/lib/config/constants";
import { safeJsonParse } from "@/lib/utils/base";

type ServerSetting = {
  quota_warning_enabled?: boolean;
  notify_type?: string;
  quota_warning_threshold?: number;
  notification_email?: string;
  webhook_url?: string;
  webhook_secret?: string;
  bark_url?: string;
  gotify_url?: string;
  gotify_token?: string;
  gotify_priority?: number;
  accept_unset_model_ratio_model?: boolean;
  record_ip_log?: boolean;
};
import {
  notificationSettingSchema,
  type NotificationSettingSchema,
} from "@/lib/validation/settings";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { Value } from "@sinclair/typebox/value";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export function NotificationCard() {
  const t = useTranslations();
  const authQuery = useAuthQuery();
  const updateSettingMutation = useUpdateSettingMutation();
  const user = authQuery.data;

  const form = useForm({
    resolver: typeboxResolver(notificationSettingSchema),
    defaultValues: Value.Default(
      notificationSettingSchema,
      {},
    ) as NotificationSettingSchema,
  });

  const notifyType = form.watch("notify_type");
  const quotaWarningEnabled = form.watch("quota_warning_enabled");

  useEffect(() => {
    if (!user?.setting) return;
    const s = safeJsonParse<Partial<ServerSetting>>(user.setting, {});
    form.reset({
      quota_warning_enabled: s.quota_warning_enabled ?? false,
      notify_type: s.notify_type || "email",
      quota_threshold_dollars: s.quota_warning_threshold
        ? quotaToDollars(s.quota_warning_threshold)
        : 1,
      notification_email: s.notification_email || "",
      webhook_url: s.webhook_url || "",
      webhook_secret: s.webhook_secret || "",
      bark_url: s.bark_url || "",
      gotify_url: s.gotify_url || "",
      gotify_token: s.gotify_token || "",
      gotify_priority: s.gotify_priority ?? 5,
    });
  }, [user?.setting, form]);

  function onSubmit(data: NotificationSettingSchema) {
    const parsed = safeJsonParse<Partial<ServerSetting>>(user?.setting, {});
    analytics.settings.notificationSaved({
      method: data.notify_type,
      quota_threshold_dollars: data.quota_threshold_dollars || 1,
    });
    updateSettingMutation.mutate(
      {
        body: {
          quota_warning_enabled: data.quota_warning_enabled,
          notify_type: data.notify_type,
          quota_warning_threshold: dollarsToQuota(
            data.quota_threshold_dollars || 1,
          ),
          accept_unset_model_ratio_model:
            parsed.accept_unset_model_ratio_model ?? false,
          record_ip_log: parsed.record_ip_log ?? false,
          notification_email:
            data.notify_type === "email" ? data.notification_email : undefined,
          webhook_url:
            data.notify_type === "webhook" ? data.webhook_url : undefined,
          webhook_secret:
            data.notify_type === "webhook" ? data.webhook_secret : undefined,
          bark_url: data.notify_type === "bark" ? data.bark_url : undefined,
          gotify_url:
            data.notify_type === "gotify" ? data.gotify_url : undefined,
          gotify_token:
            data.notify_type === "gotify" ? data.gotify_token : undefined,
          gotify_priority:
            data.notify_type === "gotify" ? data.gotify_priority : undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success(t("SETTINGS.NOTIFICATIONS.SETTINGS_SAVED"));
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("SETTINGS.NOTIFICATIONS.TITLE")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="quota_warning_enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <FormLabel>
                      {t("SETTINGS.NOTIFICATIONS.QUOTA_WARNING_ENABLED")}
                    </FormLabel>
                    <FormDescription className="text-muted-foreground text-xs">
                      {t("SETTINGS.NOTIFICATIONS.QUOTA_WARNING_ENABLED_DESC")}
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

            {quotaWarningEnabled && (
              <>
                <FormField
                  control={form.control}
                  name="notify_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("SETTINGS.NOTIFICATIONS.METHOD")}
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(v) => {
                            if (v)
                              analytics.settings.notificationChannelChanged(v);
                            field.onChange(v);
                          }}
                        >
                          <SelectTrigger className="w-full sm:w-64">
                            <SelectValue>
                              {{
                                email: t("SETTINGS.NOTIFICATIONS.METHOD_EMAIL"),
                                webhook: t(
                                  "SETTINGS.NOTIFICATIONS.METHOD_WEBHOOK",
                                ),
                                bark: t("SETTINGS.NOTIFICATIONS.METHOD_BARK"),
                                gotify: t(
                                  "SETTINGS.NOTIFICATIONS.METHOD_GOTIFY",
                                ),
                              }[field.value] || field.value}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">
                              {t("SETTINGS.NOTIFICATIONS.METHOD_EMAIL")}
                            </SelectItem>
                            <SelectItem value="webhook">
                              {t("SETTINGS.NOTIFICATIONS.METHOD_WEBHOOK")}
                            </SelectItem>
                            <SelectItem value="bark">
                              {t("SETTINGS.NOTIFICATIONS.METHOD_BARK")}
                            </SelectItem>
                            <SelectItem value="gotify">
                              {t("SETTINGS.NOTIFICATIONS.METHOD_GOTIFY")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="space-y-1">
                  <MyFormInput
                    control={form.control}
                    name="quota_threshold_dollars"
                    schema={notificationSettingSchema}
                    label={t("SETTINGS.NOTIFICATIONS.QUOTA_THRESHOLD")}
                    type="number"
                    step="0.1"
                    min="0"
                    symbol="$"
                    className="w-32"
                  />
                  <p className="text-muted-foreground text-xs">
                    {t("SETTINGS.NOTIFICATIONS.QUOTA_THRESHOLD_DESC")}
                  </p>
                </div>

                {notifyType === "email" && (
                  <MyFormInput
                    control={form.control}
                    name="notification_email"
                    schema={notificationSettingSchema}
                    label={t("SETTINGS.NOTIFICATIONS.EMAIL_ADDRESS")}
                    type="email"
                    placeholder={t("SETTINGS.NOTIFICATIONS.EMAIL_PLACEHOLDER")}
                    className="sm:w-96"
                  />
                )}

                {notifyType === "webhook" && (
                  <div className="space-y-4">
                    <MyFormInput
                      control={form.control}
                      name="webhook_url"
                      schema={notificationSettingSchema}
                      label={t("SETTINGS.NOTIFICATIONS.WEBHOOK_URL")}
                      placeholder={t(
                        "SETTINGS.NOTIFICATIONS.WEBHOOK_URL_PLACEHOLDER",
                      )}
                    />
                    <MyFormInput
                      control={form.control}
                      name="webhook_secret"
                      schema={notificationSettingSchema}
                      label={t("SETTINGS.NOTIFICATIONS.WEBHOOK_SECRET")}
                      placeholder={t(
                        "SETTINGS.NOTIFICATIONS.WEBHOOK_SECRET_PLACEHOLDER",
                      )}
                    />
                  </div>
                )}

                {notifyType === "bark" && (
                  <MyFormInput
                    control={form.control}
                    name="bark_url"
                    schema={notificationSettingSchema}
                    label={t("SETTINGS.NOTIFICATIONS.BARK_URL")}
                    placeholder={t(
                      "SETTINGS.NOTIFICATIONS.BARK_URL_PLACEHOLDER",
                    )}
                  />
                )}

                {notifyType === "gotify" && (
                  <div className="space-y-4">
                    <MyFormInput
                      control={form.control}
                      name="gotify_url"
                      schema={notificationSettingSchema}
                      label={t("SETTINGS.NOTIFICATIONS.GOTIFY_URL")}
                      placeholder={t(
                        "SETTINGS.NOTIFICATIONS.GOTIFY_URL_PLACEHOLDER",
                      )}
                    />
                    <MyFormInput
                      control={form.control}
                      name="gotify_token"
                      schema={notificationSettingSchema}
                      label={t("SETTINGS.NOTIFICATIONS.GOTIFY_TOKEN")}
                      placeholder={t(
                        "SETTINGS.NOTIFICATIONS.GOTIFY_TOKEN_PLACEHOLDER",
                      )}
                    />
                    <MyFormInput
                      control={form.control}
                      name="gotify_priority"
                      schema={notificationSettingSchema}
                      label={t("SETTINGS.NOTIFICATIONS.GOTIFY_PRIORITY")}
                      type="number"
                      min="0"
                      max="10"
                      className="w-24"
                    />
                  </div>
                )}
              </>
            )}

            <Button type="submit" disabled={updateSettingMutation.isPending}>
              {t("SETTINGS.NOTIFICATIONS.SAVE_SETTINGS")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
