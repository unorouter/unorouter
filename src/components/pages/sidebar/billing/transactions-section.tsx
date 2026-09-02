"use client";

import { DataTable } from "@/components/elements/table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  useBillingPlansQuery,
  useBillingPortalMutation,
  useSubscriptionOrdersQuery,
  useTopUpHistoryQuery,
} from "@/hooks/billing/billing-hook";
import { useCopyToClipboard } from "@/hooks/ui/use-copy-to-clipboard";
import { analytics } from "@/lib/analytics";
import { DataTableId } from "@/lib/types/enums";
import { formatTimestamp } from "@/lib/utils/format/date";
import { createTableAtoms } from "@/store/data-table-store";
import type { ColumnDef } from "@tanstack/react-table";
import type { TableFeats } from "@/lib/config/table-features";
import { useAtomValue } from "jotai";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

const PORTAL_PROVIDERS = ["stripe", "creem"];

const PAID_STATUSES = ["success", "paid"];

type TransactionRow = {
  id: number;
  money: number;
  status: string;
  trade_no: string;
  payment_method: string;
  create_time: number;
  complete_time: number;
  invoice_url: string;
  description: string;
};

function statusVariant(status: string) {
  if (PAID_STATUSES.includes(status)) return "default";
  if (status === "pending") return "secondary";
  return "destructive";
}

const STATUS_KEYS = {
  pending: "BILLING.TRANSACTIONS.STATUS_PENDING",
  success: "BILLING.TRANSACTIONS.STATUS_SUCCESS",
  paid: "BILLING.TRANSACTIONS.STATUS_PAID",
  failed: "BILLING.TRANSACTIONS.STATUS_FAILED",
  expired: "BILLING.TRANSACTIONS.STATUS_EXPIRED",
} as const;

function useTransactionColumns(): ColumnDef<TableFeats, TransactionRow>[] {
  const t = useTranslations();
  const portalMutation = useBillingPortalMutation();
  const copy = useCopyToClipboard();

  function handleGetInvoice(row: TransactionRow) {
    analytics.billing.portalOpened();
    portalMutation.mutate(
      { provider: row.payment_method as "stripe" | "creem" },
      {
        onSuccess: (data) => {
          const url = data?.portal_url;
          if (url) window.open(url, "_blank");
          else toast.error(t("BILLING.PORTAL.ERROR"));
        },
        onError: () => toast.error(t("BILLING.PORTAL.ERROR")),
      },
    );
  }

  return [
    {
      accessorKey: "complete_time",
      header: t("BILLING.TRANSACTIONS.DATE"),
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs whitespace-nowrap">
          {formatTimestamp(
            row.original.complete_time || row.original.create_time,
          )}
        </span>
      ),
    },
    {
      accessorKey: "description",
      header: t("BILLING.TRANSACTIONS.DESCRIPTION"),
      cell: ({ row }) => (
        <span className="text-foreground text-sm">
          {row.original.description}
        </span>
      ),
    },
    {
      accessorKey: "payment_method",
      header: t("BILLING.TRANSACTIONS.METHOD"),
      cell: ({ row }) =>
        row.original.payment_method ? (
          <Badge variant="outline">{row.original.payment_method}</Badge>
        ) : (
          <Badge variant="ghost">
            {t("BILLING.TRANSACTIONS.METHOD_MANUAL")}
          </Badge>
        ),
    },
    {
      accessorKey: "money",
      header: t("BILLING.TRANSACTIONS.AMOUNT"),
      meta: { headerClassName: "text-right", cellClassName: "text-right" },
      cell: ({ row }) => (
        <span className="font-mono text-sm tabular-nums">
          ${row.original.money.toFixed(2)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: t("BILLING.TRANSACTIONS.STATUS"),
      cell: ({ row }) => (
        <Badge variant={statusVariant(row.original.status)}>
          {row.original.status in STATUS_KEYS
            ? t(STATUS_KEYS[row.original.status as keyof typeof STATUS_KEYS])
            : row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: t("BILLING.TRANSACTIONS.ACTIONS"),
      meta: { headerClassName: "text-right", cellClassName: "text-right" },
      cell: ({ row }) => {
        const item = row.original;
        const isPaid = PAID_STATUSES.includes(item.status);

        if (item.invoice_url && isPaid) {
          return (
            <a
              href={item.invoice_url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              {t("BILLING.TRANSACTIONS.VIEW_INVOICE")}
              <Icon name="external-link" className="h-3.5 w-3.5" />
            </a>
          );
        }

        if (isPaid && PORTAL_PROVIDERS.includes(item.payment_method)) {
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleGetInvoice(item)}
              disabled={portalMutation.isPending}
            >
              {t("BILLING.TRANSACTIONS.GET_INVOICE")}
              <Icon name="file-text" className="h-3.5 w-3.5" />
            </Button>
          );
        }

        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              copy.copy(item.trade_no, {
                withToast: true,
                successMessage: t("BILLING.TRANSACTIONS.COPIED"),
              })
            }
          >
            <span className="max-w-32 truncate font-mono text-[11px]">
              {item.trade_no}
            </span>
            <Icon name="clipboard-copy" className="h-3.5 w-3.5" />
          </Button>
        );
      },
    },
  ];
}

function EmptyState() {
  const t = useTranslations();
  return (
    <div className="flex flex-col items-center gap-2">
      <Icon name="credit-card" className="text-muted-foreground h-6 w-6" />
      <span className="text-muted-foreground text-sm">
        {t("BILLING.TRANSACTIONS.EMPTY")}
      </span>
    </div>
  );
}

function TopUpTransactions() {
  const t = useTranslations();
  const tableAtoms = createTableAtoms(DataTableId.BILLING_TOPUP_HISTORY);
  const store = useAtomValue(tableAtoms.baseAtom);
  const columns = useTransactionColumns();

  const topUpsQuery = useTopUpHistoryQuery({
    p: store.pagination.pageIndex + 1,
    page_size: store.pagination.pageSize,
  });

  const rows: TransactionRow[] = (topUpsQuery.data?.items ?? []).map(
    (item) => ({
      id: item.id,
      money: item.money,
      status: item.status,
      trade_no: item.trade_no,
      payment_method: item.payment_method,
      create_time: item.create_time,
      complete_time: item.complete_time,
      invoice_url: item.invoice_url,
      // Deliberately not item.amount: providers disagree on its unit. Creem
      // stores quota units (2500000 for $5) while NowPayments, Stripe and
      // DeloPay store dollars (5), so rendering it showed the same $5 payment
      // as "5 units" or "2500000 units" depending on how it was paid. The
      // AMOUNT column already shows the money, which every provider agrees on.
      description: t("BILLING.TRANSACTIONS.TOPUP_DESCRIPTION"),
    }),
  );

  return (
    <DataTable
      id={DataTableId.BILLING_TOPUP_HISTORY}
      data={rows}
      columns={columns}
      total={topUpsQuery.data?.total ?? 0}
      isLoading={topUpsQuery.isLoading}
      emptyState={<EmptyState />}
    />
  );
}

function SubscriptionTransactions() {
  const t = useTranslations();
  const tableAtoms = createTableAtoms(DataTableId.BILLING_SUBSCRIPTION_HISTORY);
  const store = useAtomValue(tableAtoms.baseAtom);
  const columns = useTransactionColumns();
  const plansQuery = useBillingPlansQuery();

  const ordersQuery = useSubscriptionOrdersQuery({
    p: store.pagination.pageIndex + 1,
    page_size: store.pagination.pageSize,
  });

  const plans = plansQuery.data ?? [];

  const rows: TransactionRow[] = (ordersQuery.data?.items ?? []).map(
    (item) => ({
      id: item.id,
      money: item.money,
      status: item.status,
      trade_no: item.trade_no,
      payment_method: item.payment_method,
      create_time: item.create_time,
      complete_time: item.complete_time,
      invoice_url: item.invoice_url,
      description:
        plans.find((plan) => plan.plan.id === item.plan_id)?.plan.title ??
        t("BILLING.SUBSCRIPTION.PLAN_FALLBACK", { planId: item.plan_id }),
    }),
  );

  return (
    <DataTable
      id={DataTableId.BILLING_SUBSCRIPTION_HISTORY}
      data={rows}
      columns={columns}
      total={ordersQuery.data?.total ?? 0}
      isLoading={ordersQuery.isLoading}
      emptyState={<EmptyState />}
    />
  );
}

export function TransactionsSection(props: { kind: "topups" | "orders" }) {
  if (props.kind === "topups") return <TopUpTransactions />;
  return <SubscriptionTransactions />;
}
