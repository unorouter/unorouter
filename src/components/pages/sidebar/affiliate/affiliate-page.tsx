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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/elements/table/data-table";
import { useAuthQuery } from "@/hooks/auth-hook";
import {
  useAffiliateCommissionsQuery,
  useAffiliateInviteesQuery,
  useTransferAffQuotaMutation,
} from "@/hooks/affiliate-hook";
import { DataTableId } from "@/lib/types/enums";
import { createTableAtoms } from "@/store/data-table-store";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  LuArrowRightLeft,
  LuCopy,
  LuDollarSign,
  LuGift,
  LuPercent,
  LuRepeat,
  LuUsers,
  LuWallet,
} from "react-icons/lu";
import {
  dollarsToQuota,
  quotaToDollars,
  renderQuota,
} from "@/lib/config/constants";
import { toast } from "sonner";
import dayjs from "dayjs";
import type { ColumnDef } from "@tanstack/react-table";
import { useAtomValue } from "jotai";

function formatDate(timestamp: number): string {
  if (!timestamp || timestamp <= 0) return "";
  return dayjs.unix(timestamp).format("MMM D, YYYY");
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

type InviteeRow = {
  id: number;
  username: string;
  display_name: string;
  created_at: number;
  status: number;
  commission_count: number;
  total_earned: number;
};

type CommissionRow = {
  id: number;
  created_at: number;
  invitee_username: string;
  recharge_amount: number;
  commission_rate: number;
  commission_quota: number;
  payment_method: string;
};

function InviteesTab() {
  const t = useTranslations();
  const tableAtoms = createTableAtoms(DataTableId.AFFILIATE_INVITEES);
  const store = useAtomValue(tableAtoms.baseAtom);

  const inviteesQuery = useAffiliateInviteesQuery({
    p: store.pagination.pageIndex + 1,
    page_size: store.pagination.pageSize,
  });

  const responseData = inviteesQuery.data as
    | { data?: { items?: InviteeRow[]; total?: number } }
    | undefined;

  const pageInfo = responseData?.data;
  const invitees: InviteeRow[] = pageInfo?.items ?? [];
  const total = pageInfo?.total ?? 0;

  const columns: ColumnDef<InviteeRow>[] = [
    {
      accessorKey: "username",
      header: t("AFFILIATE.COL_USER"),
      cell: ({ row }) => (
        <span className="text-foreground text-sm font-medium">
          {row.original.display_name || row.original.username || "\u2014"}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: t("AFFILIATE.COL_JOINED"),
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
    {
      accessorKey: "commission_count",
      header: t("AFFILIATE.COL_COMMISSIONS"),
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          {row.original.commission_count}
        </span>
      ),
    },
    {
      accessorKey: "total_earned",
      header: t("AFFILIATE.COL_TOTAL_EARNED"),
      cell: ({ row }) => (
        <span
          className="font-mono text-sm font-medium tabular-nums"
          style={{ color: "var(--chart-2)" }}
        >
          {renderQuota(row.original.total_earned)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: t("AFFILIATE.COL_STATUS"),
      cell: ({ row }) => (
        <span
          className="font-mono text-xs"
          style={{
            color:
              row.original.status === 1
                ? "var(--chart-2)"
                : "var(--destructive)",
          }}
        >
          {row.original.status === 1
            ? t("AFFILIATE.STATUS_ACTIVE")
            : t("AFFILIATE.STATUS_DISABLED")}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      id={DataTableId.AFFILIATE_INVITEES}
      data={invitees}
      columns={columns}
      total={total}
      isLoading={inviteesQuery.isLoading}
      emptyState={
        <div className="flex flex-col items-center gap-2">
          <LuUsers className="text-muted-foreground h-6 w-6" />
          <span className="text-muted-foreground text-sm">
            {t("AFFILIATE.NO_INVITEES")}
          </span>
        </div>
      }
    />
  );
}

function CommissionsTab() {
  const t = useTranslations();
  const tableAtoms = createTableAtoms(DataTableId.AFFILIATE_COMMISSIONS);
  const store = useAtomValue(tableAtoms.baseAtom);

  const commissionsQuery = useAffiliateCommissionsQuery({
    p: store.pagination.pageIndex + 1,
    page_size: store.pagination.pageSize,
  });

  const responseData = commissionsQuery.data as
    | { data?: { items?: CommissionRow[]; total?: number } }
    | undefined;

  const pageInfo = responseData?.data;
  const commissions = pageInfo?.items ?? [];
  const total = pageInfo?.total ?? 0;

  const columns: ColumnDef<CommissionRow>[] = [
    {
      accessorKey: "created_at",
      header: t("AFFILIATE.COL_DATE"),
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
    {
      accessorKey: "invitee_username",
      header: t("AFFILIATE.COL_USER"),
      cell: ({ row }) => (
        <span className="text-foreground text-sm font-medium">
          {row.original.invitee_username || "\u2014"}
        </span>
      ),
    },
    {
      accessorKey: "recharge_amount",
      header: t("AFFILIATE.COL_RECHARGE"),
      cell: ({ row }) => (
        <span className="font-mono text-sm tabular-nums">
          {renderQuota(row.original.recharge_amount)}
        </span>
      ),
    },
    {
      accessorKey: "commission_rate",
      header: t("AFFILIATE.COL_RATE"),
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.commission_rate != null
            ? `${(row.original.commission_rate * 100).toFixed(0)}%`
            : "\u2014"}
        </span>
      ),
    },
    {
      accessorKey: "commission_quota",
      header: t("AFFILIATE.COL_EARNED"),
      meta: { headerClassName: "text-right", cellClassName: "text-right" },
      cell: ({ row }) => (
        <span
          className="font-mono text-sm font-medium tabular-nums"
          style={{ color: "var(--chart-2)" }}
        >
          {renderQuota(row.original.commission_quota)}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      id={DataTableId.AFFILIATE_COMMISSIONS}
      data={commissions}
      columns={columns}
      total={total}
      isLoading={commissionsQuery.isLoading}
      emptyState={
        <div className="flex flex-col items-center gap-2">
          <LuGift className="text-muted-foreground h-6 w-6" />
          <span className="text-muted-foreground text-sm">
            {t("AFFILIATE.NO_COMMISSIONS")}
          </span>
        </div>
      }
    />
  );
}

export function AffiliatePage() {
  const t = useTranslations();
  const authQuery = useAuthQuery();
  const transferMutation = useTransferAffQuotaMutation();
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState("");

  const user = authQuery.data
  const isLoading = authQuery.isLoading;
  const affCode = user?.aff_code ?? "";
  const pendingQuota = user?.aff_quota ?? 0;
  const totalEarned = user?.aff_history_quota ?? 0;
  const inviteCount = user?.aff_count ?? 0;
  const commissionRate = user?.aff_commission_rate ?? 0;
  const maxRecharges = user?.aff_commission_max_recharges ?? 0;

  const inviteLink = affCode
    ? `${process.env.NEXT_PUBLIC_URL}/register?aff=${affCode}`
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
      <div className="bg-border mb-6 grid grid-cols-2 gap-px md:grid-cols-5">
        <div className="border-border bg-background flex flex-col p-5">
          <StatItem
            label={t("AFFILIATE.COMMISSION_RATE")}
            value={`${commissionRate}%`}
            icon={<LuPercent className="h-4 w-4" />}
            isLoading={isLoading}
            accentColor="var(--chart-4)"
          />
        </div>
        <div className="border-border bg-background flex flex-col p-5">
          <StatItem
            label={t("AFFILIATE.MAX_RECHARGES")}
            value={maxRecharges === 0 ? t("AFFILIATE.UNLIMITED") : maxRecharges}
            icon={<LuRepeat className="h-4 w-4" />}
            isLoading={isLoading}
            accentColor="var(--chart-5)"
          />
        </div>
        <div className="border-border bg-background flex flex-col p-5">
          <StatItem
            label={t("AFFILIATE.PENDING_EARNINGS")}
            value={renderQuota(pendingQuota)}
            icon={<LuWallet className="h-4 w-4" />}
            isLoading={isLoading}
            accentColor="var(--chart-2)"
          />
        </div>
        <div className="border-border bg-background flex flex-col p-5">
          <StatItem
            label={t("AFFILIATE.TOTAL_EARNED")}
            value={renderQuota(totalEarned)}
            icon={<LuDollarSign className="h-4 w-4" />}
            isLoading={isLoading}
            accentColor="var(--chart-3)"
          />
        </div>
        <div className="border-border bg-background flex flex-col p-5">
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
            <LuArrowRightLeft
              data-icon="inline-start"
              className="h-3.5 w-3.5"
            />
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
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center font-mono text-xs font-bold"
              style={{ color: "var(--chart-1)" }}
            >
              01
            </div>
            <div>
              <span className="text-foreground block text-sm font-medium">
                {t("AFFILIATE.STEP_1_TITLE")}
              </span>
              <span className="text-muted-foreground block text-xs">
                {t("AFFILIATE.STEP_1_DESC")}
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
                {t("AFFILIATE.STEP_2_TITLE")}
              </span>
              <span className="text-muted-foreground block text-xs">
                {t("AFFILIATE.STEP_2_DESC")}
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
                {t("AFFILIATE.STEP_3_TITLE")}
              </span>
              <span className="text-muted-foreground block text-xs">
                {t("AFFILIATE.STEP_3_DESC")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Invited Users + Commission History */}
      <Tabs defaultValue="invitees">
        <TabsList variant="line">
          <TabsTrigger value="invitees">
            <LuUsers className="h-3.5 w-3.5" />
            {t("AFFILIATE.TAB_INVITEES")}
          </TabsTrigger>
          <TabsTrigger value="commissions">
            <LuGift className="h-3.5 w-3.5" />
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
              <span className="text-muted-foreground text-sm">
                {t("AFFILIATE.AVAILABLE")}
              </span>
              <span className="text-foreground font-mono text-sm font-bold tabular-nums">
                {renderQuota(pendingQuota)}
              </span>
            </div>
            <div className="space-y-2">
              <Label>{t("AFFILIATE.TRANSFER_AMOUNT")}</Label>
              <div className="relative">
                <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                  $
                </span>
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
