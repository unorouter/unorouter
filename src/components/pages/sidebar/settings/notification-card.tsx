"use client";

import { useAuthQuery } from "@/hooks/auth-hook";
import { useUpdateSettingMutation } from "@/hooks/settings-hook";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { dollarsToQuota, quotaToDollars } from "@/lib/config/constants";

function parseUserSetting(settingStr: string) {
  try {
    return JSON.parse(settingStr || "{}");
  } catch {
    return {};
  }
}

export function NotificationCard() {
  const t = useTranslations();
  const authQuery = useAuthQuery();
  const updateSettingMutation = useUpdateSettingMutation();
  const user = authQuery.data;

  const parsed = parseUserSetting(user?.setting || "");

  const [notifyType, setNotifyType] = useState(parsed.notify_type || "email");
  const [threshold, setThreshold] = useState(
    parsed.quota_warning_threshold
      ? String(quotaToDollars(parsed.quota_warning_threshold))
      : "1",
  );
  const [notificationEmail, setNotificationEmail] = useState(
    parsed.notification_email || "",
  );
  const [webhookUrl, setWebhookUrl] = useState(parsed.webhook_url || "");
  const [webhookSecret, setWebhookSecret] = useState(
    parsed.webhook_secret || "",
  );
  const [barkUrl, setBarkUrl] = useState(parsed.bark_url || "");
  const [gotifyUrl, setGotifyUrl] = useState(parsed.gotify_url || "");
  const [gotifyToken, setGotifyToken] = useState(parsed.gotify_token || "");
  const [gotifyPriority, setGotifyPriority] = useState(
    String(parsed.gotify_priority ?? 5),
  );

  // Update state when user data loads
  useEffect(() => {
    if (!user?.setting) return;
    const s = parseUserSetting(user.setting);
    setNotifyType(s.notify_type || "email");
    setThreshold(
      s.quota_warning_threshold
        ? String(quotaToDollars(s.quota_warning_threshold))
        : "1",
    );
    setNotificationEmail(s.notification_email || "");
    setWebhookUrl(s.webhook_url || "");
    setWebhookSecret(s.webhook_secret || "");
    setBarkUrl(s.bark_url || "");
    setGotifyUrl(s.gotify_url || "");
    setGotifyToken(s.gotify_token || "");
    setGotifyPriority(String(s.gotify_priority ?? 5));
  }, [user?.setting]);

  function handleSave() {
    updateSettingMutation.mutate(
      {
        notify_type: notifyType,
        quota_warning_threshold: dollarsToQuota(Number(threshold) || 1),
        accept_unset_model_ratio_model: parsed.accept_unset_model_ratio_model ?? false,
        record_ip_log: parsed.record_ip_log ?? false,
        notification_email: notifyType === "email" ? notificationEmail : undefined,
        webhook_url: notifyType === "webhook" ? webhookUrl : undefined,
        webhook_secret: notifyType === "webhook" ? webhookSecret : undefined,
        bark_url: notifyType === "bark" ? barkUrl : undefined,
        gotify_url: notifyType === "gotify" ? gotifyUrl : undefined,
        gotify_token: notifyType === "gotify" ? gotifyToken : undefined,
        gotify_priority: notifyType === "gotify" ? Number(gotifyPriority) : undefined,
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
      <CardContent className="space-y-6">
        {/* Notification Method */}
        <div className="space-y-2">
          <Label>{t("SETTINGS.NOTIFICATIONS.METHOD")}</Label>
          <Select value={notifyType} onValueChange={setNotifyType}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
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
        </div>

        {/* Quota Threshold */}
        <div className="space-y-2">
          <Label>{t("SETTINGS.NOTIFICATIONS.QUOTA_THRESHOLD")}</Label>
          <p className="text-muted-foreground text-xs">
            {t("SETTINGS.NOTIFICATIONS.QUOTA_THRESHOLD_DESC")}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm">$</span>
            <Input
              type="number"
              className="w-32"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              min="0"
              step="0.1"
            />
          </div>
        </div>

        {/* Dynamic Fields */}
        {notifyType === "email" && (
          <div className="space-y-2">
            <Label>{t("SETTINGS.NOTIFICATIONS.EMAIL_ADDRESS")}</Label>
            <Input
              type="email"
              placeholder={t("SETTINGS.NOTIFICATIONS.EMAIL_PLACEHOLDER")}
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              className="sm:w-96"
            />
          </div>
        )}

        {notifyType === "webhook" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("SETTINGS.NOTIFICATIONS.WEBHOOK_URL")}</Label>
              <Input
                placeholder={t("SETTINGS.NOTIFICATIONS.WEBHOOK_URL_PLACEHOLDER")}
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("SETTINGS.NOTIFICATIONS.WEBHOOK_SECRET")}</Label>
              <Input
                placeholder={t(
                  "SETTINGS.NOTIFICATIONS.WEBHOOK_SECRET_PLACEHOLDER",
                )}
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
              />
            </div>
          </div>
        )}

        {notifyType === "bark" && (
          <div className="space-y-2">
            <Label>{t("SETTINGS.NOTIFICATIONS.BARK_URL")}</Label>
            <Input
              placeholder={t("SETTINGS.NOTIFICATIONS.BARK_URL_PLACEHOLDER")}
              value={barkUrl}
              onChange={(e) => setBarkUrl(e.target.value)}
            />
          </div>
        )}

        {notifyType === "gotify" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("SETTINGS.NOTIFICATIONS.GOTIFY_URL")}</Label>
              <Input
                placeholder={t("SETTINGS.NOTIFICATIONS.GOTIFY_URL_PLACEHOLDER")}
                value={gotifyUrl}
                onChange={(e) => setGotifyUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("SETTINGS.NOTIFICATIONS.GOTIFY_TOKEN")}</Label>
              <Input
                placeholder={t(
                  "SETTINGS.NOTIFICATIONS.GOTIFY_TOKEN_PLACEHOLDER",
                )}
                value={gotifyToken}
                onChange={(e) => setGotifyToken(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("SETTINGS.NOTIFICATIONS.GOTIFY_PRIORITY")}</Label>
              <Input
                type="number"
                className="w-24"
                value={gotifyPriority}
                onChange={(e) => setGotifyPriority(e.target.value)}
                min="0"
                max="10"
              />
            </div>
          </div>
        )}

        {/* Save */}
        <Button
          disabled={updateSettingMutation.isPending}
          onClick={handleSave}
        >
          {t("SETTINGS.NOTIFICATIONS.SAVE_SETTINGS")}
        </Button>
      </CardContent>
    </Card>
  );
}
