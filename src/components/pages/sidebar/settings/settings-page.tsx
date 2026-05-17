"use client";

import { PageContent } from "@/components/layout/sidebar/sidebar-layout";
import { useTranslations } from "next-intl";
import { AccountCard } from "./account-card";
import { AccountHeader } from "./account-header";
import { NotificationCard } from "./notification-card";
import { SecurityCard } from "./security-card";
import { Icon } from "@/components/ui/icon";

export function SettingsPage() {
  const t = useTranslations();

  return (
    <PageContent>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
          <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
            {t("SIDEBAR.SETTINGS")}
          </span>
        </div>
        <h1 className="text-foreground mt-1 text-xl font-bold tracking-tight md:text-2xl">
          {t("SETTINGS.TITLE")}
        </h1>
      </div>

      {/* Account Info */}
      <div className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <Icon name="settings" className="text-muted-foreground h-4 w-4" />
          <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
            {t("SETTINGS.ACCOUNT_INFO")}
          </span>
        </div>
        <AccountHeader />
      </div>

      {/* Account Management */}
      <div className="mb-6">
        <AccountCard />
      </div>

      {/* Security */}
      <div className="mb-6">
        <SecurityCard />
      </div>

      {/* Notifications */}
      <div className="mb-6">
        <NotificationCard />
      </div>
    </PageContent>
  );
}
