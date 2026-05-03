import { processPlans } from "@/lib/api/subscription";
import { QUOTA_PER_DOLLAR } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { getDb } from "@/lib/db/client";
import { acpCheckoutSessions, type AcpCheckoutSession } from "@/lib/db/schema";
import { uid } from "@/lib/utils/base";
import {
  getSelf,
  getSubscriptionPlans,
  getTopUpInfo,
  requestCreemPay,
  requestStripePay,
  subscriptionRequestCreemPay,
  subscriptionRequestStripePay,
} from "@/openapi";
import { and, eq } from "drizzle-orm";
import { ADMIN_HEADERS } from "../constants";
import { acpError } from "./errors";

const SITE_ORIGIN = new URL(env.appUrl).origin;
const PAYMENT_METHOD_DEFAULT = "card";

export type AcpItemKind = "topup" | "subscription";
export type AcpPaymentMethod = "stripe" | "creem";

export type ParsedItemId =
  | {
      kind: "topup";
      amountUsd: number;
      amountCents: number;
      method: AcpPaymentMethod;
      raw: string;
    }
  | {
      kind: "subscription";
      planId: number;
      method: AcpPaymentMethod;
      raw: string;
    };

// Item IDs collapse the four upstream pay endpoints into one ACP catalog.
// Format: `topup_<usd>_<method>` or `plan_<planId>_<method>`.
export function parseItemId(id: string): ParsedItemId | null {
  const topup = id.match(/^topup_(\d+(?:\.\d+)?)_(stripe|creem)$/);
  if (topup) {
    const amountUsd = Number(topup[1]);
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) return null;
    return {
      kind: "topup",
      amountUsd,
      amountCents: Math.round(amountUsd * 100),
      method: topup[2] as AcpPaymentMethod,
      raw: id,
    };
  }
  const plan = id.match(/^plan_(\d+)_(stripe|creem)$/);
  if (plan) {
    const planId = Number(plan[1]);
    if (!Number.isFinite(planId) || planId <= 0) return null;
    return {
      kind: "subscription",
      planId,
      method: plan[2] as AcpPaymentMethod,
      raw: id,
    };
  }
  return null;
}

type Catalog = {
  topupAmounts: Set<number>;
  // For Creem top-ups the upstream wants a real productId, not a USD string.
  // creem_products is a JSON-stringified array of {price, productId} that we
  // index by USD price.
  creemProductIdByAmount: Map<number, string>;
  enableStripeTopup: boolean;
  enableCreemTopup: boolean;
  planPriceCents: Map<number, number>;
};

type CreemProduct = {
  name?: string;
  productId?: string;
  price?: number;
};

function parseCreemProducts(raw: unknown): CreemProduct[] {
  if (typeof raw !== "string" || raw.length === 0) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CreemProduct[]) : [];
  } catch {
    return [];
  }
}

async function loadCatalog(
  upstreamHeaders: Record<string, string>,
): Promise<Catalog> {
  const hasUser = !!upstreamHeaders.cookie;
  const headers = hasUser ? upstreamHeaders : ADMIN_HEADERS;
  const [topup, plans] = await Promise.all([
    getTopUpInfo({ headers }),
    getSubscriptionPlans({ headers }),
  ]);

  const topupAmounts = new Set<number>(
    topup.status === 200 ? (topup.data.data.amount_options ?? []) : [],
  );
  const creemProductIdByAmount = new Map<number, string>();
  let enableStripeTopup = false;
  let enableCreemTopup = false;
  if (topup.status === 200) {
    enableStripeTopup = topup.data.data.enable_stripe_topup ?? false;
    enableCreemTopup = topup.data.data.enable_creem_topup ?? false;
    for (const product of parseCreemProducts(topup.data.data.creem_products)) {
      if (
        typeof product.price === "number" &&
        typeof product.productId === "string"
      ) {
        creemProductIdByAmount.set(product.price, product.productId);
      }
    }
  }
  const planPriceCents = new Map<number, number>();
  if (plans.status === 200) {
    for (const p of processPlans(plans.data.data)) {
      planPriceCents.set(p.id, Math.round(p.priceAmount * 100));
    }
  }
  return {
    topupAmounts,
    creemProductIdByAmount,
    enableStripeTopup,
    enableCreemTopup,
    planPriceCents,
  };
}

type ResolvedItem = {
  parsed: ParsedItemId;
  amountCents: number;
};

async function resolveItem(
  parsed: ParsedItemId,
  catalog: Catalog,
  index: number,
): Promise<ResolvedItem> {
  if (parsed.kind === "topup") {
    if (!catalog.topupAmounts.has(parsed.amountUsd)) {
      acpError(400, {
        type: "invalid_request",
        code: "invalid",
        message: `Top-up amount ${parsed.amountUsd} USD is not offered`,
        param: `$.items[${index}].id`,
      });
    }
    if (parsed.method === "stripe" && !catalog.enableStripeTopup) {
      acpError(400, {
        type: "invalid_request",
        code: "invalid",
        message:
          "Stripe top-up is not currently enabled; use a *_creem item id",
        param: `$.items[${index}].id`,
      });
    }
    if (parsed.method === "creem") {
      if (!catalog.enableCreemTopup) {
        acpError(400, {
          type: "invalid_request",
          code: "invalid",
          message: "Creem top-up is not currently enabled",
          param: `$.items[${index}].id`,
        });
      }
      if (!catalog.creemProductIdByAmount.has(parsed.amountUsd)) {
        acpError(400, {
          type: "invalid_request",
          code: "invalid",
          message: `Creem product for ${parsed.amountUsd} USD is not configured`,
          param: `$.items[${index}].id`,
        });
      }
    }
    return { parsed, amountCents: parsed.amountCents };
  }
  const cents = catalog.planPriceCents.get(parsed.planId);
  if (cents === undefined) {
    acpError(400, {
      type: "invalid_request",
      code: "invalid",
      message: `Subscription plan ${parsed.planId} is not available`,
      param: `$.items[${index}].id`,
    });
  }
  return { parsed, amountCents: cents };
}

// SessionBody is the JSON-serializable payload we persist in the body
// column. Elysia has already validated the shape via TypeBox at the route
// boundary, so we accept it as a typed bag.
export type SessionBody = Record<string, unknown>;

export type CheckoutItem = { id: string; quantity: number };

// validateAndResolveItem applies the ACP-spec single-item invariant to the
// input array, parses the item id, and resolves it against the catalog. All
// three validation calls share the same error template so we don't duplicate
// the acpError(400, ...) shape across createSession and updateSession.
async function validateAndResolveItem(
  items: CheckoutItem[],
  upstreamHeaders: Record<string, string>,
): Promise<ResolvedItem> {
  if (items.length !== 1) {
    acpError(400, {
      type: "invalid_request",
      code: "invalid",
      message: "Exactly one item per checkout session is supported",
      param: "$.items",
    });
  }
  const item = items[0];
  if (item.quantity !== 1) {
    acpError(400, {
      type: "invalid_request",
      code: "invalid",
      message: "Quantity must be 1",
      param: "$.items[0].quantity",
    });
  }
  const parsed = parseItemId(item.id);
  if (!parsed) {
    acpError(400, {
      type: "invalid_request",
      code: "invalid",
      message:
        "Unknown item id; expected topup_<usd>_<method> or plan_<id>_<method>",
      param: "$.items[0].id",
    });
  }
  const catalog = await loadCatalog(upstreamHeaders);
  return resolveItem(parsed, catalog, 0);
}

export type CreateSessionInput = {
  userId: number;
  items: CheckoutItem[];
  body: SessionBody;
  upstreamHeaders: Record<string, string>;
};

export async function createSession(input: CreateSessionInput) {
  const resolved = await validateAndResolveItem(
    input.items,
    input.upstreamHeaders,
  );

  const id = `cs_${uid(16)}`;
  const db = getDb();
  await db.insert(acpCheckoutSessions).values({
    id,
    userId: input.userId,
    status: "ready_for_payment",
    currency: "usd",
    itemId: resolved.parsed.raw,
    quantity: 1,
    amountCents: resolved.amountCents,
    paymentMethod: resolved.parsed.method,
    body: input.body,
  });

  const row = await getSessionRow(input.userId, id);
  if (!row) throw new Error("Failed to read back created session");
  return toCartResponse(row);
}

export type UpdateSessionInput = {
  userId: number;
  sessionId: string;
  body: SessionBody;
  items?: CheckoutItem[];
  upstreamHeaders: Record<string, string>;
};

export async function updateSession(input: UpdateSessionInput) {
  const row = await mustGetSession(input.userId, input.sessionId);
  if (row.status === "completed" || row.status === "canceled") {
    acpError(405, {
      type: "invalid_request",
      code: "invalid",
      message: `Session is ${row.status} and cannot be updated`,
    });
  }

  const db = getDb();
  if (input.items !== undefined) {
    const resolved = await validateAndResolveItem(
      input.items,
      input.upstreamHeaders,
    );
    await db
      .update(acpCheckoutSessions)
      .set({
        itemId: resolved.parsed.raw,
        amountCents: resolved.amountCents,
        paymentMethod: resolved.parsed.method,
        body: input.body,
        updatedAt: new Date(),
      })
      .where(eq(acpCheckoutSessions.id, row.id));
  } else {
    await db
      .update(acpCheckoutSessions)
      .set({ body: input.body, updatedAt: new Date() })
      .where(eq(acpCheckoutSessions.id, row.id));
  }

  const nextRow = await getSessionRow(input.userId, row.id);
  if (!nextRow) throw new Error("Failed to re-read updated session");
  return toCartResponse(nextRow);
}

export async function getSession(
  userId: number,
  sessionId: string,
  upstreamHeaders: Record<string, string>,
) {
  const row = await mustGetSession(userId, sessionId);
  const advanced = await maybeAdvanceCompleted(row, upstreamHeaders);
  return toCartResponse(advanced);
}

export async function cancelSession(userId: number, sessionId: string) {
  const row = await mustGetSession(userId, sessionId);
  if (row.status === "completed" || row.status === "canceled") {
    acpError(405, {
      type: "invalid_request",
      code: "invalid",
      message: `Session is already ${row.status}`,
    });
  }
  const db = getDb();
  await db
    .update(acpCheckoutSessions)
    .set({ status: "canceled", updatedAt: new Date() })
    .where(eq(acpCheckoutSessions.id, row.id));
  const next = await getSessionRow(userId, row.id);
  if (!next) throw new Error("Failed to re-read canceled session");
  return toCartResponse(next, [
    {
      type: "info" as const,
      content_type: "plain" as const,
      content: "Checkout session has been canceled.",
    },
  ]);
}

export type CompleteSessionInput = {
  userId: number;
  sessionId: string;
  upstreamHeaders: Record<string, string>;
};

export async function completeSession(input: CompleteSessionInput) {
  const row = await mustGetSession(input.userId, input.sessionId);
  if (row.status === "completed") {
    return toCartResponse(row);
  }
  if (row.status === "canceled") {
    acpError(405, {
      type: "invalid_request",
      code: "invalid",
      message: "Session is canceled and cannot be completed",
    });
  }

  const parsed = parseItemId(row.itemId);
  if (!parsed) {
    acpError(400, {
      type: "processing_error",
      code: "invalid",
      message: "Stored item id is malformed; recreate the session",
    });
  }

  const headers = input.upstreamHeaders;
  let payLink: string;

  if (parsed.kind === "topup") {
    if (parsed.method === "stripe") {
      const res = await requestStripePay(
        {
          amount: parsed.amountUsd,
          payment_method: PAYMENT_METHOD_DEFAULT,
        },
        { headers },
      );
      payLink = res.data.data.pay_link;
    } else {
      // Creem expects its own product id (e.g. prod_xxx), not a USD amount, and
      // payment_method must be "creem" for the channel to resolve. We re-load
      // the catalog here so the productId reflects whatever the upstream
      // currently advertises.
      const catalog = await loadCatalog(headers);
      const productId = catalog.creemProductIdByAmount.get(parsed.amountUsd);
      if (!productId) {
        acpError(503, {
          type: "service_unavailable",
          code: "invalid",
          message: `Creem product for ${parsed.amountUsd} USD is not configured upstream`,
        });
      }
      const res = await requestCreemPay(
        { product_id: productId, payment_method: "creem" },
        { headers },
      );
      payLink = res.data.data.checkout_url;
    }
  } else if (parsed.method === "stripe") {
    const res = await subscriptionRequestStripePay(
      { plan_id: parsed.planId },
      { headers },
    );
    payLink = res.data.data.pay_link;
  } else {
    const res = await subscriptionRequestCreemPay(
      { plan_id: parsed.planId },
      { headers },
    );
    payLink = res.data.data.checkout_url;
  }

  if (!payLink) {
    acpError(503, {
      type: "service_unavailable",
      code: "invalid",
      message: "Payment gateway did not return a checkout URL",
    });
  }

  // Snapshot the user's current upstream quota so subsequent GETs can detect
  // that payment landed (the upstream Creem/Stripe webhook credits balance
  // asynchronously). For top-ups the delta should be roughly amountUsd worth
  // of quota points; for subscriptions the same signal works because plan
  // purchases also bump quota. If snapshot fails we proceed without it; the
  // session will simply stay in_progress until the user re-checks.
  const quotaAtComplete = await fetchUserQuota(input.upstreamHeaders);

  const db = getDb();
  // Status stays in_progress because the user still has to complete payment
  // in the hosted checkout UI. GET will lazily advance to "completed" once
  // the upstream quota reflects the deposit.
  await db
    .update(acpCheckoutSessions)
    .set({
      status: "in_progress",
      payLink,
      quotaAtComplete: quotaAtComplete ?? null,
      updatedAt: new Date(),
    })
    .where(eq(acpCheckoutSessions.id, row.id));

  const next = await getSessionRow(input.userId, row.id);
  if (!next) throw new Error("Failed to re-read completed session");
  return toCartResponse(next);
}

async function fetchUserQuota(
  upstreamHeaders: Record<string, string>,
): Promise<number | null> {
  try {
    const res = await getSelf({ headers: upstreamHeaders });
    if (res.status !== 200) return null;
    const quota = res.data.data.quota;
    return typeof quota === "number" ? quota : null;
  } catch {
    return null;
  }
}

// Heuristic to detect that an in_progress session has been paid: compare the
// user's current upstream quota against the snapshot we took at /complete. If
// the delta covers the session amount in quota points, advance to "completed".
// This is a best-effort signal — any unrelated balance increase between the
// snapshot and the GET would also trigger advancement. We accept that because
// the alternative (sessions stuck in_progress forever) is worse for agents.
async function maybeAdvanceCompleted(
  row: AcpCheckoutSession,
  upstreamHeaders: Record<string, string>,
): Promise<AcpCheckoutSession> {
  if (row.status !== "in_progress") return row;
  if (row.quotaAtComplete == null) return row;
  const currentQuota = await fetchUserQuota(upstreamHeaders);
  if (currentQuota == null) return row;
  const requiredDelta = (row.amountCents / 100) * QUOTA_PER_DOLLAR;
  if (currentQuota - row.quotaAtComplete < requiredDelta) return row;
  const db = getDb();
  await db
    .update(acpCheckoutSessions)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(acpCheckoutSessions.id, row.id));
  const refreshed = await getSessionRow(row.userId, row.id);
  return refreshed ?? row;
}

async function getSessionRow(userId: number, id: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(acpCheckoutSessions)
    .where(
      and(
        eq(acpCheckoutSessions.userId, userId),
        eq(acpCheckoutSessions.id, id),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function mustGetSession(
  userId: number,
  id: string,
): Promise<AcpCheckoutSession> {
  const row = await getSessionRow(userId, id);
  if (!row) {
    acpError(404, {
      type: "invalid_request",
      code: "invalid",
      message: "Checkout session not found",
    });
  }
  return row;
}

type AcpMessage = {
  type: "info" | "warning" | "error";
  content_type: "plain" | "markdown";
  content: string;
  code?: string;
};

export function toCartResponse(
  row: AcpCheckoutSession,
  extraMessages: AcpMessage[] = [],
) {
  const lineItem = {
    id: `li_${row.id}`,
    item: { id: row.itemId, quantity: row.quantity },
    base_amount: row.amountCents,
    discount: 0,
    subtotal: row.amountCents,
    tax: 0,
    total: row.amountCents,
  };
  const totals = [
    {
      type: "items_base_amount" as const,
      display_text: "Item(s) total",
      amount: row.amountCents,
    },
    {
      type: "subtotal" as const,
      display_text: "Subtotal",
      amount: row.amountCents,
    },
    { type: "tax" as const, display_text: "Tax", amount: 0 },
    {
      type: "total" as const,
      display_text: "Total",
      amount: row.amountCents,
    },
  ];

  const order =
    row.status === "completed" || row.status === "in_progress"
      ? row.payLink
        ? {
            id: `ord_${row.id}`,
            checkout_session_id: row.id,
            permalink_url: row.payLink,
          }
        : undefined
      : undefined;

  return {
    id: row.id,
    status: row.status,
    currency: row.currency,
    line_items: [lineItem],
    fulfillment_options: [],
    selected_fulfillment_options: [],
    totals,
    messages: extraMessages,
    links: [
      { type: "terms_of_use", url: `${SITE_ORIGIN}/terms` },
      { type: "privacy_policy", url: `${SITE_ORIGIN}/privacy` },
    ],
    ...(order ? { order } : {}),
  };
}
