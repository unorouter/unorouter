"use client";

import { SidebarPageHeader } from "@/components/elements/content/sidebar-page-header";
import { BadgeGenerator } from "@/components/elements/badge/badge-generator";
import { StatItem } from "@/components/elements/stat-item";
import { PageContent } from "@/components/layout/sidebar/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { useAffiliateInviteesQuery } from "@/hooks/billing/affiliate-hook";
import { renderQuota } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { copyToClipboard } from "@/lib/utils/base";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { CommissionsTab } from "./commissions-tab";
import { InviteesTab } from "./invitees-tab";
import { TransferDialog } from "./transfer-dialog";

export function Affiliate() {
  const t = useTranslations();
  const authQuery = useAuthQuery();
  const inviteesQuery = useAffiliateInviteesQuery({ p: 1, page_size: 1 });
  const [transferOpen, setTransferOpen] = useState(false);

  const user = authQuery.data;
  const isLoading = authQuery.isLoading;
  const affCode = user?.aff_code ?? "";
  const pendingQuota = user?.aff_quota ?? 0;
  const totalEarned = user?.aff_history_quota ?? 0;
  const inviteCount = inviteesQuery.data?.total ?? 0;
  // aff_count only counts invitees that have paid a commission
  const payingCount = user?.aff_count ?? 0;
  const commissionRate = user?.aff_commission_rate ?? 0;
  const maxRecharges = user?.aff_commission_max_recharges ?? 0;

  const inviteLink = affCode ? `${env.appUrl}/register?aff=${affCode}` : "";

  function handleCopyLink() {
    if (!inviteLink) return;
    copyToClipboard(inviteLink);
    toast.success(t("AFFILIATE.LINK_COPIED"));
  }

  function handleCopyCode() {
    if (!affCode) return;
    copyToClipboard(affCode);
    toast.success(t("AFFILIATE.CODE_COPIED"));
  }

  return (
    <PageContent>
      <SidebarPageHeader
        className="mb-6"
        eyebrow={t("AFFILIATE.TITLE")}
        title={t("AFFILIATE.TITLE")}
        description={t("AFFILIATE.DESCRIPTION")}
      />

      <div className="bg-border mb-6 grid grid-cols-2 gap-px md:grid-cols-5">
        {(
          [
            ["AFFILIATE.COMMISSION_RATE", `${commissionRate}%`, "percent", 4],
            [
              "AFFILIATE.MAX_RECHARGES",
              maxRecharges === 0 ? t("AFFILIATE.UNLIMITED") : maxRecharges,
              "repeat",
              5,
            ],
            [
              "AFFILIATE.PENDING_EARNINGS",
              renderQuota(pendingQuota),
              "wallet",
              2,
            ],
            [
              "AFFILIATE.TOTAL_EARNED",
              renderQuota(totalEarned),
              "dollar-sign",
              3,
            ],
          ] as const
        ).map((stat) => (
          <div
            key={stat[0]}
            className="border-border bg-background flex flex-col p-5"
          >
            <StatItem
              label={t(stat[0])}
              value={stat[1]}
              icon={<Icon name={stat[2]} className="h-4 w-4" />}
              isLoading={isLoading}
              accentColor={`var(--chart-${stat[3]})`}
            />
          </div>
        ))}
        <div className="border-border bg-background col-span-2 flex flex-col p-5 md:col-span-1">
          <StatItem
            label={t("AFFILIATE.INVITE_COUNT")}
            value={inviteCount}
            icon={<Icon name="users" className="h-4 w-4" />}
            isLoading={isLoading || inviteesQuery.isLoading}
            trend={
              <span className="text-muted-foreground font-mono text-xs tabular-nums">
                {t("AFFILIATE.PAYING_COUNT", { count: payingCount })}
              </span>
            }
            accentColor="var(--chart-1)"
          />
        </div>
      </div>

      {/* Left: How It Works + Invite/Transfer | Right: Badge Generator */}
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div className="border-border border p-5">
            <span className="text-muted-foreground mb-3 block font-mono text-[10px] font-medium tracking-widest uppercase">
              {t("AFFILIATE.HOW_IT_WORKS")}
            </span>
            <div className="flex flex-col gap-3">
              {([1, 2, 3] as const).map((n) => (
                <div key={n} className="flex gap-3">
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center font-mono text-xs font-bold"
                    style={{ color: `var(--chart-${n})` }}
                  >
                    0{n}
                  </div>
                  <div>
                    <span className="text-foreground block text-sm font-medium">
                      {t(`AFFILIATE.STEPS.${n}.TITLE`)}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {t(`AFFILIATE.STEPS.${n}.DESC`)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-border text-muted-foreground mt-4 flex gap-2 border-t pt-3 text-xs">
              <Icon
                name="info"
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                aria-hidden
              />
              <span>{t("AFFILIATE.SELF_INVITE_NOTICE")}</span>
            </div>
          </div>

          <div className="border-border grid grid-cols-1 gap-px border">
            <div className="p-5">
              <span className="text-muted-foreground mb-3 block font-mono text-[10px] font-medium tracking-widest uppercase">
                {t("AFFILIATE.INVITE_LINK")}
              </span>
              <div className="flex items-center gap-2">
                <div className="bg-muted flex min-w-0 flex-1 items-center overflow-hidden px-3 py-2">
                  <code className="text-foreground truncate font-mono text-xs">
                    {inviteLink || "-"}
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
                  {affCode || "-"}
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
                onClick={() => setTransferOpen(true)}
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

        <BadgeGenerator defaultType="referral" refCode={affCode} />
      </div>

      <Tabs defaultValue="invitees">
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
