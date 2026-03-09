"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthQuery } from "@/hooks/auth-hook";
import {
  useAffiliateCommissionsQuery,
  useTransferAffQuotaMutation,
} from "@/hooks/affiliate-hook";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  LuArrowRightLeft,
  LuCopy,
  LuDollarSign,
  LuGift,
  LuUsers,
  LuWallet,
} from "react-icons/lu";
import { dollarsToQuota, quotaToDollars, renderQuota } from "@/lib/config/constants";
import { toast } from "sonner";

function formatDate(timestamp: number): string {
  if (!timestamp || timestamp <= 0) return "";
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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
          <span className="text-foreground block text-lg font-bold tabular-nums tracking-tight">
            {typeof props.value === "number"
              ? props.value.toLocaleString()
              : (props.value ?? "\u2014")}
          </span>
        )}
      </div>
    </div>
  );
}

export function AffiliatePage() {
  const t = useTranslations();
  const authQuery = useAuthQuery();
  const commissionsQuery = useAffiliateCommissionsQuery();
  const transferMutation = useTransferAffQuotaMutation();
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState("");

  const user = authQuery.data as
    | {
        aff_code?: string;
        aff_count?: number;
        aff_history_quota?: number;
        aff_quota?: number;
      }
    | undefined;

  const commissionsData = commissionsQuery.data as
    | {
        data?: Array<{
          id?: number;
          created_at?: number;
          invitee_username?: string;
          recharge_amount?: number;
          commission_rate?: number;
          commission_quota?: number;
          payment_method?: string;
        }>;
        success?: boolean;
        message?: string;
      }
    | Array<{
        id?: number;
        created_at?: number;
        invitee_username?: string;
        recharge_amount?: number;
        commission_rate?: number;
        commission_quota?: number;
        payment_method?: string;
      }>
    | undefined;

  const commissions = Array.isArray(commissionsData)
    ? commissionsData
    : commissionsData && "data" in commissionsData && Array.isArray(commissionsData.data)
      ? commissionsData.data
      : [];

  const isLoading = authQuery.isLoading;
  const affCode = user?.aff_code ?? "";
  const pendingQuota = user?.aff_quota ?? 0;
  const totalEarned = user?.aff_history_quota ?? 0;
  const inviteCount = user?.aff_count ?? 0;

  const inviteLink =
    typeof window !== "undefined" && affCode
      ? `${window.location.origin}/register?aff=${affCode}`
      : "";

  function handleCopyLink() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    toast.success(t("AFFILIATE.LINK_COPIED"));
  }

  function handleCopyCode() {
    if (!affCode) return;
    navigator.clipboard.writeText(affCode);
    toast.success(t("AFFILIATE.CODE_COPIED"));
  }

  function handleTransfer() {
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error(t("AFFILIATE.TRANSFER_INVALID"));
      return;
    }
    const quotaUnits = dollarsToQuota(amount);
    if (quotaUnits > pendingQuota) {
      toast.error(t("AFFILIATE.TRANSFER_EXCEEDS"));
      return;
    }
    transferMutation.mutate(quotaUnits, {
      onSuccess: () => {
        toast.success(t("AFFILIATE.TRANSFER_SUCCESS"));
        setTransferOpen(false);
        setTransferAmount("");
      },
      onError: () => toast.error(t("AFFILIATE.TRANSFER_FAILED")),
    });
  }

  return (
    <div className="flex w-full flex-1 flex-col gap-0 p-4 md:p-6">
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
      <div className="bg-border mb-6 grid grid-cols-1 gap-px md:grid-cols-3">
        <div className="border-border flex flex-col bg-background p-5">
          <StatItem
            label={t("AFFILIATE.PENDING_EARNINGS")}
            value={renderQuota(pendingQuota)}
            icon={<LuWallet className="h-4 w-4" />}
            isLoading={isLoading}
            accentColor="var(--chart-2)"
          />
        </div>
        <div className="border-border flex flex-col bg-background p-5">
          <StatItem
            label={t("AFFILIATE.TOTAL_EARNED")}
            value={renderQuota(totalEarned)}
            icon={<LuDollarSign className="h-4 w-4" />}
            isLoading={isLoading}
            accentColor="var(--chart-3)"
          />
        </div>
        <div className="border-border flex flex-col bg-background p-5">
          <StatItem
            label={t("AFFILIATE.INVITE_COUNT")}
            value={inviteCount}
            icon={<LuUsers className="h-4 w-4" />}
            isLoading={isLoading}
            accentColor="var(--chart-1)"
          />
        </div>
      </div>

      {/* Invite Link + Transfer */}
      <div className="border-border mb-6 grid grid-cols-1 gap-px border md:grid-cols-2">
        {/* Invite Link Section */}
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
              <LuCopy data-icon="inline-start" className="h-3.5 w-3.5" />
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
              <LuCopy className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Transfer Section */}
        <div className="border-border border-t p-5 md:border-t-0 md:border-l">
          <span className="text-muted-foreground mb-3 block font-mono text-[10px] font-medium tracking-widest uppercase">
            {t("AFFILIATE.TRANSFER_SECTION")}
          </span>
          <p className="text-muted-foreground mb-3 text-xs">
            {t("AFFILIATE.TRANSFER_DESC")}
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
            <LuArrowRightLeft data-icon="inline-start" className="h-3.5 w-3.5" />
            {t("AFFILIATE.TRANSFER_TO_BALANCE")}
          </Button>
        </div>
      </div>

      {/* How It Works */}
      <div className="border-border mb-6 border p-5">
        <span className="text-muted-foreground mb-3 block font-mono text-[10px] font-medium tracking-widest uppercase">
          {t("AFFILIATE.HOW_IT_WORKS")}
        </span>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center font-mono text-xs font-bold" style={{ color: "var(--chart-1)" }}>
              01
            </div>
            <div>
              <span className="text-foreground block text-sm font-medium">{t("AFFILIATE.STEP_1_TITLE")}</span>
              <span className="text-muted-foreground block text-xs">{t("AFFILIATE.STEP_1_DESC")}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center font-mono text-xs font-bold" style={{ color: "var(--chart-2)" }}>
              02
            </div>
            <div>
              <span className="text-foreground block text-sm font-medium">{t("AFFILIATE.STEP_2_TITLE")}</span>
              <span className="text-muted-foreground block text-xs">{t("AFFILIATE.STEP_2_DESC")}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center font-mono text-xs font-bold" style={{ color: "var(--chart-3)" }}>
              03
            </div>
            <div>
              <span className="text-foreground block text-sm font-medium">{t("AFFILIATE.STEP_3_TITLE")}</span>
              <span className="text-muted-foreground block text-xs">{t("AFFILIATE.STEP_3_DESC")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Commission History Table */}
      <div className="border-border overflow-hidden border">
        <div className="border-border border-b p-4">
          <span className="text-muted-foreground font-mono text-[10px] font-medium tracking-widest uppercase">
            {t("AFFILIATE.COMMISSION_HISTORY")}
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                {t("AFFILIATE.COL_DATE")}
              </TableHead>
              <TableHead className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                {t("AFFILIATE.COL_USER")}
              </TableHead>
              <TableHead className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                {t("AFFILIATE.COL_RECHARGE")}
              </TableHead>
              <TableHead className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                {t("AFFILIATE.COL_RATE")}
              </TableHead>
              <TableHead className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase text-right">
                {t("AFFILIATE.COL_EARNED")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {commissionsQuery.isLoading && (
              <>
                {[1, 2, 3].map((i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="ml-auto h-4 w-16" /></TableCell>
                  </TableRow>
                ))}
              </>
            )}

            {!commissionsQuery.isLoading && commissions.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <LuGift className="text-muted-foreground h-6 w-6" />
                    <span className="text-muted-foreground text-sm">
                      {t("AFFILIATE.NO_COMMISSIONS")}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {commissions.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell>
                  <span className="text-muted-foreground font-mono text-xs">
                    {formatDate(c.created_at)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-foreground text-sm font-medium">
                    {c.invitee_username || "\u2014"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm tabular-nums">
                    {renderQuota(c.recharge_amount)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground font-mono text-xs">
                    {c.commission_rate != null ? `${(c.commission_rate * 100).toFixed(0)}%` : "\u2014"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-mono text-sm font-medium tabular-nums" style={{ color: "var(--chart-2)" }}>
                    {renderQuota(c.commission_quota)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("AFFILIATE.TRANSFER_TITLE")}</DialogTitle>
            <DialogDescription>
              {t("AFFILIATE.TRANSFER_DIALOG_DESC")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">{t("AFFILIATE.AVAILABLE")}</span>
              <span className="text-foreground font-mono text-sm font-bold tabular-nums">
                {renderQuota(pendingQuota)}
              </span>
            </div>
            <div className="space-y-2">
              <Label>{t("AFFILIATE.TRANSFER_AMOUNT")}</Label>
              <div className="relative">
                <span className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 text-sm">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-7"
                />
              </div>
              <div className="flex gap-1">
                {[25, 50, 75, 100].map((pct) => {
                  const val = quotaToDollars(pendingQuota) * (pct / 100);
                  return (
                    <Button
                      key={pct}
                      variant="outline"
                      size="xs"
                      onClick={() => setTransferAmount(val.toFixed(2))}
                      disabled={pendingQuota <= 0}
                    >
                      {pct}%
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>
              {t("AFFILIATE.CANCEL")}
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={transferMutation.isPending || !transferAmount}
            >
              <LuArrowRightLeft data-icon="inline-start" className="h-4 w-4" />
              {t("AFFILIATE.CONFIRM_TRANSFER")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
