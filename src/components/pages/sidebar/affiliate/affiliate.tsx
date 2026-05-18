"use client";

import { BadgeGenerator } from "@/components/elements/badge/badge-generator";
import { PageContent } from "@/components/layout/sidebar/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthQuery } from "@/hooks/auth-hook";
import { analytics } from "@/lib/analytics";
import { renderQuota } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { copyToClipboard } from "@/lib/utils/base";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { CommissionsTab } from "./commissions-tab";
import { InviteesTab } from "./invitees-tab";
import { TransferDialog } from "./transfer-dialog";

type StatItemProps = {
  label: string;
  value: string | number | undefined;
  icon: React.ReactNode;
  isLoading: boolean;
  accentColor: string;
};

function StatItem(props: StatItemProps) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center"
        style={{ color: props.accentColor }}
      >
        {props.icon}
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-muted-foreground block font-mono text-[10px] tracking-widest uppercase">
          {props.label}
        </span>
        {props.isLoading ? (
          <Skeleton className="mt-1 h-5 w-20" />
        ) : (
          <span className="text-foreground block text-lg font-bold tracking-tight tabular-nums">
            {typeof props.value === "number"
              ? props.value.toLocaleString()
              : (props.value ?? "\u2014")}
          </span>
        )}
      </div>
    </div>
  );
}

export function Affiliate() {
  const t = useTranslations();
  const authQuery = useAuthQuery();
  const [transferOpen, setTransferOpen] = useState(false);

  const user = authQuery.data;
  const isLoading = authQuery.isLoading;
  const affCode = user?.aff_code ?? "";
  const pendingQuota = user?.aff_quota ?? 0;
  const totalEarned = user?.aff_history_quota ?? 0;
  const inviteCount = user?.aff_count ?? 0;
  const commissionRate = user?.aff_commission_rate ?? 0;
  const maxRecharges = user?.aff_commission_max_recharges ?? 0;

  const inviteLink = affCode ? `${env.appUrl}/register?aff=${affCode}` : "";

  function handleCopyLink() {
    if (!inviteLink) return;
    copyToClipboard(inviteLink);
    analytics.affiliate.linkCopied();
    toast.success(t("AFFILIATE.LINK_COPIED"));
  }

  function handleCopyCode() {
    if (!affCode) return;
    copyToClipboard(affCode);
    analytics.affiliate.codeCopied();
    toast.success(t("AFFILIATE.CODE_COPIED"));
  }

  return (
    <PageContent>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
          <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
            {t("AFFILIATE.TITLE")}
          </span>
        </div>
        <h1 className="text-foreground mt-1 text-xl font-bold tracking-tight md:text-2xl">
          {t("AFFILIATE.TITLE")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("AFFILIATE.DESCRIPTION")}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="bg-border mb-6 grid grid-cols-2 gap-px md:grid-cols-5">
        <div className="border-border bg-background flex flex-col p-5">
          <StatItem
            label={t("AFFILIATE.COMMISSION_RATE")}
            value={`${commissionRate}%`}
            icon={<Icon name="percent" className="h-4 w-4" />}
            isLoading={isLoading}
            accentColor="var(--chart-4)"
          />
        </div>
        <div className="border-border bg-background flex flex-col p-5">
          <StatItem
            label={t("AFFILIATE.MAX_RECHARGES")}
            value={maxRecharges === 0 ? t("AFFILIATE.UNLIMITED") : maxRecharges}
            icon={<Icon name="repeat" className="h-4 w-4" />}
            isLoading={isLoading}
            accentColor="var(--chart-5)"
          />
        </div>
        <div className="border-border bg-background flex flex-col p-5">
          <StatItem
            label={t("AFFILIATE.PENDING_EARNINGS")}
            value={renderQuota(pendingQuota)}
            icon={<Icon name="wallet" className="h-4 w-4" />}
            isLoading={isLoading}
            accentColor="var(--chart-2)"
          />
        </div>
        <div className="border-border bg-background flex flex-col p-5">
          <StatItem
            label={t("AFFILIATE.TOTAL_EARNED")}
            value={renderQuota(totalEarned)}
            icon={<Icon name="dollar-sign" className="h-4 w-4" />}
            isLoading={isLoading}
            accentColor="var(--chart-3)"
          />
        </div>
        <div className="border-border bg-background flex flex-col p-5">
          <StatItem
            label={t("AFFILIATE.INVITE_COUNT")}
            value={inviteCount}
            icon={<Icon name="users" className="h-4 w-4" />}
            isLoading={isLoading}
            accentColor="var(--chart-1)"
          />
        </div>
      </div>

      {/* Left: How It Works + Invite/Transfer | Right: Badge Generator */}
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-6">
          {/* How It Works */}
          <div className="border-border border p-5">
            <span className="text-muted-foreground mb-3 block font-mono text-[10px] font-medium tracking-widest uppercase">
              {t("AFFILIATE.HOW_IT_WORKS")}
            </span>
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center font-mono text-xs font-bold"
                  style={{ color: "var(--chart-1)" }}
                >
                  01
                </div>
                <div>
                  <span className="text-foreground block text-sm font-medium">
                    {t("AFFILIATE.STEPS.1.TITLE")}
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    {t("AFFILIATE.STEPS.1.DESC")}
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center font-mono text-xs font-bold"
                  style={{ color: "var(--chart-2)" }}
                >
                  02
                </div>
                <div>
                  <span className="text-foreground block text-sm font-medium">
                    {t("AFFILIATE.STEPS.2.TITLE")}
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    {t("AFFILIATE.STEPS.2.DESC")}
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center font-mono text-xs font-bold"
                  style={{ color: "var(--chart-3)" }}
                >
                  03
                </div>
                <div>
                  <span className="text-foreground block text-sm font-medium">
                    {t("AFFILIATE.STEPS.3.TITLE")}
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    {t("AFFILIATE.STEPS.3.DESC")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Invite Link + Transfer */}
          <div className="border-border grid grid-cols-1 gap-px border">
            <div className="p-5">
              <span className="text-muted-foreground mb-3 block font-mono text-[10px] font-medium tracking-widest uppercase">
                {t("AFFILIATE.INVITE_LINK")}
              </span>
              <div className="flex items-center gap-2">
                <div className="bg-muted flex min-w-0 flex-1 items-center overflow-hidden px-3 py-2">
                  <code className="text-foreground truncate font-mono text-xs">
                    {inviteLink || "\u2014"}
                  </code>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  disabled={!inviteLink}
                >
                  <Icon
                    name="copy"
                    data-icon="inline-start"
                    className="h-3.5 w-3.5"
                  />
                  {t("AFFILIATE.COPY_LINK")}
                </Button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                  {t("AFFILIATE.YOUR_CODE")}
                </span>
                <code className="bg-muted text-foreground px-2 py-0.5 font-mono text-xs">
                  {affCode || "\u2014"}
                </code>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleCopyCode}
                  disabled={!affCode}
                >
                  <Icon name="copy" className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="border-border border-t p-5">
              <span className="text-muted-foreground mb-3 block font-mono text-[10px] font-medium tracking-widest uppercase">
                {t("AFFILIATE.TRANSFER.SECTION")}
              </span>
              <p className="text-muted-foreground mb-3 text-xs">
                {t("AFFILIATE.TRANSFER.DESC")}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-foreground font-mono text-sm font-bold tabular-nums">
                  {renderQuota(pendingQuota)}
                </span>
                <span className="text-muted-foreground text-xs">
                  {t("AFFILIATE.AVAILABLE")}
                </span>
              </div>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => {
                  analytics.affiliate.transferDialogOpened();
                  setTransferOpen(true);
                }}
                disabled={pendingQuota <= 0}
              >
                <Icon
                  name="arrow-right-left"
                  data-icon="inline-start"
                  className="h-3.5 w-3.5"
                />
                {t("AFFILIATE.TRANSFER.TO_BALANCE")}
              </Button>
            </div>
          </div>
        </div>

        {/* Badge Generator */}
        <BadgeGenerator defaultType="referral" refCode={affCode} />
      </div>

      {/* Tabs: Invited Users + Commission History */}
      <Tabs
        defaultValue="invitees"
        onValueChange={(tab) => analytics.affiliate.tabChanged({ tab })}
      >
        <TabsList variant="line">
          <TabsTrigger value="invitees">
            <Icon name="users" className="h-3.5 w-3.5" />
            {t("AFFILIATE.TAB_INVITEES")}
          </TabsTrigger>
          <TabsTrigger value="commissions">
            <Icon name="gift" className="h-3.5 w-3.5" />
            {t("AFFILIATE.TAB_COMMISSIONS")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="invitees">
          <InviteesTab />
        </TabsContent>
        <TabsContent value="commissions">
          <CommissionsTab />
        </TabsContent>
      </Tabs>

      <TransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        pendingQuota={pendingQuota}
      />
    </PageContent>
  );
}
