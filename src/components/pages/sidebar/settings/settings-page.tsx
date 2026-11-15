"use client";

import {
  SectionTitle,
  SidebarPageHeader,
} from "@/components/elements/content/sidebar-page-header";
import { PageContent } from "@/components/layout/sidebar/sidebar-layout";
import { useTranslations } from "next-intl";
import { AccountCard } from "./account-card";
import { AccountHeader } from "./account-header";
import { BackupCard } from "./backup-card";
import { ConsentsCard } from "./consents-card";
import { CustomerTypeCard } from "./customer-type-card";
import { NotificationCard } from "./notification-card";
import { OwnPurposeObjectionCard } from "./own-purpose-objection-card";
import { SecurityCard } from "./security-card";
import { TimeoutCard } from "./timeout-card";

export function SettingsPage() {
  const t = useTranslations();

  return (
    <PageContent>
      <SidebarPageHeader
        className="mb-6"
        eyebrow={t("SIDEBAR.SETTINGS")}
        title={t("SETTINGS.TITLE")}
      />

      <div className="mb-6 space-y-6">
        <div>
          <SectionTitle icon="settings" label={t("SETTINGS.ACCOUNT_INFO")} />
          <AccountHeader />
        </div>
        <CustomerTypeCard />
        <AccountCard />
        <SecurityCard />
        <NotificationCard />
        <TimeoutCard />
        <ConsentsCard />
        <OwnPurposeObjectionCard />
        <BackupCard />
      </div>
    </PageContent>
  );
}
