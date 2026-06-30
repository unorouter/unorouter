"use client";

import { SectionBoundary } from "@/components/elements/feedback/section-boundary";
import { PageContent } from "@/components/layout/sidebar/sidebar-layout";
import { Icon } from "@/components/ui/icon";
import { env } from "@/lib/config/env";
import { analytics } from "@/lib/analytics";
import { useTranslations } from "next-intl";
import { AccountStats } from "./account-stats";
import { SubscriptionSection } from "./subscription-section";
import { TopUpSection } from "./topup-section";

export function Billing() {
  const t = useTranslations();

  return (
    <PageContent>
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

      <div className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <Icon name="wallet" className="text-muted-foreground h-4 w-4" />
          <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
            {t("BILLING.ACCOUNT_STATS")}
          </span>
        </div>
        <SectionBoundary>
          <AccountStats />
        </SectionBoundary>
      </div>

      <div className="mb-6">
        <SectionBoundary>
          <SubscriptionSection />
        </SectionBoundary>
      </div>

      <div className="mb-6">
        <SectionBoundary>
          <TopUpSection />
        </SectionBoundary>
      </div>

      <div className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <Icon name="mail" className="text-muted-foreground h-4 w-4" />
          <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
            {t("BILLING.SUPPORT_TITLE")}
          </span>
        </div>
        <p className="text-muted-foreground text-sm">
          {t("BILLING.SUPPORT_TEXT", { supportEmail: env.supportEmail })}
        </p>
        <a
          href={`mailto:${env.supportEmail}`}
          className="text-foreground hover:text-muted-foreground mt-1 inline-block text-sm font-medium underline underline-offset-4"
          onClick={() => analytics.navigation.supportEmailClicked()}
        >
          {env.supportEmail}
        </a>
      </div>
    </PageContent>
  );
}
