"use client";

import { PageContent } from "@/components/layout/sidebar/sidebar-layout";
import { useTranslations } from "next-intl";
import { LuWallet } from "react-icons/lu";
import { AccountStats } from "./account-stats";
import { SubscriptionSection } from "./subscription-section";
import { TopUpSection } from "./topup-section";

export function Billing() {
  const t = useTranslations();

  return (
    <PageContent>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
          <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
            {t("SIDEBAR.BILLING")}
          </span>
        </div>
        <h1 className="text-foreground mt-1 text-xl font-bold tracking-tight md:text-2xl">
          {t("BILLING.TITLE")}
        </h1>
      </div>

      {/* Account Stats */}
      <div className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <LuWallet className="text-muted-foreground h-4 w-4" />
          <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
            {t("BILLING.ACCOUNT_STATS")}
          </span>
        </div>
        <AccountStats />
      </div>

      {/* Subscriptions */}
      <div className="mb-6">
        <SubscriptionSection />
      </div>

      {/* Top Up */}
      <div className="mb-6">
        <TopUpSection />
      </div>
    </PageContent>
  );
}
