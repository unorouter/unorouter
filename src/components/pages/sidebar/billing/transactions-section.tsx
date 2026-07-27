"use client";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useBillingPlansQuery,
  useBillingPortalMutation,
  useSubscriptionOrdersQuery,
  useTopUpHistoryQuery,
} from "@/hooks/billing/billing-hook";
import { useCopyToClipboard } from "@/hooks/ui/use-copy-to-clipboard";
import { analytics } from "@/lib/analytics";
import { formatTimestamp } from "@/lib/utils/format/date";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

// Providers whose hosted portal can mint an invoice on demand. Crypto and
// balance payments have no portal, so those rows fall back to the trade number.
const PORTAL_PROVIDERS = ["stripe", "creem"];

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
  if (status === "success" || status === "paid") return "default";
  if (status === "pending") return "secondary";
  return "destructive";
}

// next-intl needs literal keys, so the runtime status maps to a fixed key here.
const STATUS_KEYS = {
  pending: "BILLING.TRANSACTIONS.STATUS_PENDING",
  success: "BILLING.TRANSACTIONS.STATUS_SUCCESS",
  paid: "BILLING.TRANSACTIONS.STATUS_PAID",
  failed: "BILLING.TRANSACTIONS.STATUS_FAILED",
  expired: "BILLING.TRANSACTIONS.STATUS_EXPIRED",
} as const;

function TransactionTable(props: {
  rows: TransactionRow[];
  isLoading: boolean;
  emptyLabel: string;
}) {
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

  if (props.isLoading) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        {t("BILLING.TRANSACTIONS.LOADING")}
      </p>
    );
  }

  if (props.rows.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        {props.emptyLabel}
      </p>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("BILLING.TRANSACTIONS.DATE")}</TableHead>
            <TableHead>{t("BILLING.TRANSACTIONS.DESCRIPTION")}</TableHead>
            <TableHead>{t("BILLING.TRANSACTIONS.METHOD")}</TableHead>
            <TableHead className="text-right">
              {t("BILLING.TRANSACTIONS.AMOUNT")}
            </TableHead>
            <TableHead>{t("BILLING.TRANSACTIONS.STATUS")}</TableHead>
            <TableHead className="text-right">
              {t("BILLING.TRANSACTIONS.ACTIONS")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="whitespace-nowrap tabular-nums">
                {formatTimestamp(row.complete_time || row.create_time)}
              </TableCell>
              <TableCell>{row.description}</TableCell>
              <TableCell>
                <Badge variant="outline">{row.payment_method}</Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                ${row.money.toFixed(2)}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(row.status)}>
                  {row.status in STATUS_KEYS
                    ? t(STATUS_KEYS[row.status as keyof typeof STATUS_KEYS])
                    : row.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {row.invoice_url ? (
                  <a
                    href={row.invoice_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    {t("BILLING.TRANSACTIONS.VIEW_INVOICE")}
                    <Icon name="external-link" className="h-3.5 w-3.5" />
                  </a>
                ) : PORTAL_PROVIDERS.includes(row.payment_method) ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleGetInvoice(row)}
                    disabled={portalMutation.isPending}
                  >
                    {t("BILLING.TRANSACTIONS.GET_INVOICE")}
                    <Icon name="file-text" className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copy.copy(row.trade_no, {
                        withToast: true,
                        successMessage: t("BILLING.TRANSACTIONS.COPIED"),
                      })
                    }
                  >
                    <span className="max-w-32 truncate font-mono text-[11px]">
                      {row.trade_no}
                    </span>
                    <Icon name="clipboard-copy" className="h-3.5 w-3.5" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-muted-foreground mt-3 text-xs">
        {t("BILLING.TRANSACTIONS.COUNT", { count: props.rows.length })}
      </p>
    </>
  );
}

export function TransactionsSection() {
  const t = useTranslations();
  const topUpsQuery = useTopUpHistoryQuery({ page_size: 50 });
  const ordersQuery = useSubscriptionOrdersQuery({ page_size: 50 });
  const plansQuery = useBillingPlansQuery();

  const plans = plansQuery.data ?? [];

  const topUpRows: TransactionRow[] = (topUpsQuery.data?.items ?? []).map(
    (item) => ({
      id: item.id,
      money: item.money,
      status: item.status,
      trade_no: item.trade_no,
      payment_method: item.payment_method,
      create_time: item.create_time,
      complete_time: item.complete_time,
      invoice_url: item.invoice_url,
      description: t("BILLING.TRANSACTIONS.TOPUP_DESCRIPTION", {
        amount: item.amount,
      }),
    }),
  );

  const orderRows: TransactionRow[] = (ordersQuery.data?.items ?? []).map(
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
        plans.find((plan) => plan.id === item.plan_id)?.title ??
        t("BILLING.SUBSCRIPTION.PLAN_FALLBACK", { planId: item.plan_id }),
    }),
  );

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Icon name="credit-card" className="text-muted-foreground h-4 w-4" />
        <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
          {t("BILLING.TRANSACTIONS.TITLE")}
        </span>
      </div>

      <Tabs defaultValue="topups">
        <TabsList>
          <TabsTrigger value="topups">
            {t("BILLING.TRANSACTIONS.TAB_TOPUPS")}
          </TabsTrigger>
          <TabsTrigger value="orders">
            {t("BILLING.TRANSACTIONS.TAB_SUBSCRIPTIONS")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="topups">
          <TransactionTable
            rows={topUpRows}
            isLoading={topUpsQuery.isLoading}
            emptyLabel={t("BILLING.TRANSACTIONS.EMPTY")}
          />
        </TabsContent>

        <TabsContent value="orders">
          <TransactionTable
            rows={orderRows}
            isLoading={ordersQuery.isLoading}
            emptyLabel={t("BILLING.TRANSACTIONS.EMPTY")}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
