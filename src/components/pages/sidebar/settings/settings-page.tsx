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

      <div className="mb-6">
        <SectionTitle icon="settings" label={t("SETTINGS.ACCOUNT_INFO")} />
        <AccountHeader />
      </div>

      <div className="mb-6">
        <CustomerTypeCard />
      </div>

      <div className="mb-6">
        <AccountCard />
      </div>

      <div className="mb-6">
        <SecurityCard />
      </div>

      <div className="mb-6">
        <NotificationCard />
      </div>

      <div className="mb-6">
        <TimeoutCard />
      </div>

      <div className="mb-6">
        <ConsentsCard />
      </div>

      <div className="mb-6">
        <OwnPurposeObjectionCard />
      </div>

      <div className="mb-6">
        <BackupCard />
      </div>
    </PageContent>
  );
}
