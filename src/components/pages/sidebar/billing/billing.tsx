"use client";

import {
  SectionTitle,
  SidebarPageHeader,
} from "@/components/elements/content/sidebar-page-header";
import { PaymentMethodToggle } from "@/components/elements/billing/payment-method-toggle";
import { SectionBoundary } from "@/components/elements/feedback/section-boundary";
import { PageContent } from "@/components/layout/sidebar/sidebar-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { env } from "@/lib/config/env";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { AccountStats } from "./account-stats";
import { RedeemSection } from "./redeem-section";
import { SubscriptionSection } from "./subscription-section";
import { TopUpSection } from "./topup-section";
import {
  SubscriptionTransactions,
  TopUpTransactions,
} from "./transactions-section";

export function Billing() {
  const t = useTranslations();

  return (
    <PageContent>
      <SidebarPageHeader
        className="mb-6"
        eyebrow={t("SIDEBAR.BILLING")}
        title={t("BILLING.TITLE")}
      />

      <div className="mb-6">
        <SectionBoundary>
          <AccountStats />
        </SectionBoundary>
      </div>

      <Tabs defaultValue="buy" className="mb-6">
        <TabsList>
          <TabsTrigger value="buy">{t("BILLING.TABS.BUY")}</TabsTrigger>
          <TabsTrigger value="topup-transactions">
            {t("BILLING.TABS.TOPUP_TRANSACTIONS")}
          </TabsTrigger>
          <TabsTrigger value="subscription-transactions">
            {t("BILLING.TABS.SUBSCRIPTION_TRANSACTIONS")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="buy" className="space-y-4">
          <BuySection
            title={t("BILLING.SECTIONS.SUBSCRIPTION_PLANS")}
            hint={t("BILLING.SECTIONS.SUBSCRIPTIONS_HINT")}
          >
            <SubscriptionSection />
          </BuySection>
          <BuySection
            title={t("BILLING.SECTIONS.QUOTA_TOPUP")}
            hint={t("BILLING.SECTIONS.QUOTA_TOPUP_HINT")}
            action={<PaymentMethodToggle compact />}
          >
            <TopUpSection />
          </BuySection>
          <BuySection
            title={t("BILLING.SECTIONS.REDEEM")}
            hint={t("BILLING.SECTIONS.REDEEM_HINT")}
          >
            <RedeemSection />
          </BuySection>
        </TabsContent>

        <TabsContent value="topup-transactions">
          <SectionBoundary>
            <TopUpTransactions />
          </SectionBoundary>
        </TabsContent>

        <TabsContent value="subscription-transactions">
          <SectionBoundary>
            <SubscriptionTransactions />
          </SectionBoundary>
        </TabsContent>
      </Tabs>

      <div className="mb-6">
        <SectionTitle icon="mail" label={t("BILLING.SUPPORT_TITLE")} />
        <p className="text-muted-foreground text-sm">
          {t("BILLING.SUPPORT_TEXT", { supportEmail: env.supportEmail })}
        </p>
        <a
          href={`mailto:${env.supportEmail}`}
          className="text-foreground hover:text-muted-foreground mt-1 inline-block text-sm font-medium underline underline-offset-4"
        >
          {env.supportEmail}
        </a>
      </div>
    </PageContent>
  );
}

function BuySection(props: {
  title: string;
  hint: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-border border">
      <header className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-baseline gap-3">
          <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
            {props.title}
          </span>
          <span className="text-muted-foreground/70 text-xs">{props.hint}</span>
        </div>
        {props.action}
      </header>
      <div className="p-4">
        <SectionBoundary>{props.children}</SectionBoundary>
      </div>
    </section>
  );
}
