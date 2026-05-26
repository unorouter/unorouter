import { jotaiCookieStorage } from "@/lib/config/table-storage";
import { atomWithStorage } from "jotai/utils";

export type PaymentMethod = "card" | "crypto";

export const PAYMENT_METHOD_COOKIE = "payment-method";
export const DEFAULT_PAYMENT_METHOD: PaymentMethod = "card";

export const paymentMethodAtom = atomWithStorage<PaymentMethod>(
  PAYMENT_METHOD_COOKIE,
  DEFAULT_PAYMENT_METHOD,
  jotaiCookieStorage,
);
