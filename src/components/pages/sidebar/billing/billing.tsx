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
import { AccountStats } from "./account-stats";
import { RedeemSection } from "./redeem-section";
import { SubscriptionSection } from "./subscription-section";
import { TopUpSection } from "./topup-section";
import { TransactionsSection } from "./transactions-section";

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

        {/* Two distinct ways to pay, so each gets its own bordered block with a
            header. Previously they ran together under one faint label and the
            payment-method toggle sat up in the balance card, nowhere near the
            tiles it switches. */}
        <TabsContent value="buy" className="space-y-4">
          <section className="border-border border">
            <header className="border-border flex items-center justify-between border-b px-4 py-3">
              <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                {t("BILLING.SECTIONS.SUBSCRIPTION_PLANS")}
              </span>
              <span className="text-muted-foreground/70 text-xs">
                {t("BILLING.SECTIONS.SUBSCRIPTIONS_HINT")}
              </span>
            </header>
            <div className="p-4">
              <SectionBoundary>
                <SubscriptionSection />
              </SectionBoundary>
            </div>
          </section>

          <section className="border-border border">
            <header className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
              <div className="flex items-baseline gap-3">
                <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                  {t("BILLING.SECTIONS.QUOTA_TOPUP")}
                </span>
                <span className="text-muted-foreground/70 text-xs">
                  {t("BILLING.SECTIONS.QUOTA_TOPUP_HINT")}
                </span>
              </div>
              <PaymentMethodToggle compact />
            </header>
            <div className="p-4">
              <SectionBoundary>
                <TopUpSection />
              </SectionBoundary>
            </div>
          </section>

          <section className="border-border border">
            <header className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
              <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                {t("BILLING.SECTIONS.REDEEM")}
              </span>
              <span className="text-muted-foreground/70 text-xs">
                {t("BILLING.SECTIONS.REDEEM_HINT")}
              </span>
            </header>
            <div className="p-4">
              <SectionBoundary>
                <RedeemSection />
              </SectionBoundary>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="topup-transactions">
          <SectionBoundary>
            <TransactionsSection kind="topups" />
          </SectionBoundary>
        </TabsContent>

        <TabsContent value="subscription-transactions">
          <SectionBoundary>
            <TransactionsSection kind="orders" />
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
