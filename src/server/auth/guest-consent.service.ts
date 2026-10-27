import {
  GUEST_ID_COOKIE,
  GUEST_ID_MAX_AGE,
  GUEST_USER_ID,
  msg,
} from "@/lib/config/constants";
import { usesInputsForOwnPurposes } from "@/lib/api/own-purpose";
import { logger } from "@/lib/utils/logger";
import { getGuestOwnPurposeObjection, getStatus } from "@/openapi";
import { fetchGuestProviderConsents } from "@/server/auth/provider-consent/provider-consent.service";
import { bffServiceHeader, cookieString } from "@/server/constants";
import { getModelByName } from "@/server/models/pricing/pricing.service";
import type { Cookie } from "elysia";

const GUEST_ID_PATTERN = /^[A-Za-z0-9-]{16,64}$/;
const GUEST_CONSENT_TTL_MS = 30_000;
const GUEST_CACHE_MAX = 10_000;

// Per pod, keyed by guest and model; only a yes is cached, so a consent given
// through another pod counts at once.
const guestCoverage = new Map<string, { expires: number }>();

// Guest ids are unbounded caller input: expired entries go first, then the
// oldest, so no cache grows with the number of guests.
function cacheGuestEntry<T extends { expires: number }>(
  cache: Map<string, T>,
  guestId: string,
  entry: T,
) {
  cache.delete(guestId);
  if (cache.size >= GUEST_CACHE_MAX) {
    const now = Date.now();
    for (const [key, value] of cache)
      if (value.expires <= now) cache.delete(key);
    for (const key of cache.keys()) {
      if (cache.size < GUEST_CACHE_MAX) break;
      cache.delete(key);
    }
  }
  cache.set(guestId, entry);
}

export function readGuestId(
  cookie: Record<string, Cookie<unknown>>,
): string | undefined {
  const value = cookieString(cookie[GUEST_ID_COOKIE]?.value);
  return value && GUEST_ID_PATTERN.test(value) ? value : undefined;
}

export function ensureGuestId(cookie: Record<string, Cookie<unknown>>): string {
  const existing = readGuestId(cookie);
  if (existing) return existing;
  const created = crypto.randomUUID();
  cookie[GUEST_ID_COOKIE].set({
    value: created,
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    maxAge: GUEST_ID_MAX_AGE,
  });
  return created;
}

// The gateway takes a guest id only next to the BFF's service secret.
export function guestConsentHeaders(guestId: string): Record<string, string> {
  return { ...bffServiceHeader(), "X-Guest-Id": guestId };
}

export function forgetGuestConsents(guestId: string) {
  for (const key of guestCoverage.keys())
    if (key.startsWith(`${guestId}\n`)) guestCoverage.delete(key);
}

// Per pod like the consents; a change reaches the other pods within the TTL.
const guestObjections = new Map<
  string,
  { objects: boolean; expires: number }
>();

export function forgetGuestObjection(guestId: string) {
  guestObjections.delete(guestId);
}

// Fails open: the account path in the gateway is authoritative and an objecting
// guest is rare, so an outage here must not stop every guest chat.
async function guestObjects(guestId: string): Promise<boolean> {
  const cached = guestObjections.get(guestId);
  if (cached && cached.expires > Date.now()) return cached.objects;
  try {
    const res = await getGuestOwnPurposeObjection({
      headers: guestConsentHeaders(guestId),
    });
    if (!res.data?.success) throw new Error(res.data?.message);
    const objects = res.data.data.objection;
    cacheGuestEntry(guestObjections, guestId, {
      objects,
      expires: Date.now() + GUEST_CONSENT_TTL_MS,
    });
    return objects;
  } catch (error) {
    logger.error("guest objection lookup failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

const ENFORCEMENT_TTL_MS = 30_000;
let enforcement:
  { on: boolean; models: Set<string>; expires: number } | undefined;

// Follows the gateway's staging: the global switch or its model list.
async function consentEnforcedFor(names: string[]): Promise<boolean> {
  if (!enforcement || enforcement.expires <= Date.now()) {
    const data = (await getStatus()).data?.data;
    enforcement = {
      on: data?.consent_enforced === true,
      models: new Set(data?.consent_enforced_models ?? []),
      expires: Date.now() + ENFORCEMENT_TTL_MS,
    };
  }
  const current = enforcement;
  return current.on || names.some((name) => current.models.has(name));
}

async function guestProviderCovered(
  guestId: string,
  model: string,
): Promise<boolean> {
  const key = `${guestId}\n${model}`;
  const cached = guestCoverage.get(key);
  if (cached && cached.expires > Date.now()) return true;
  const res = await fetchGuestProviderConsents(
    guestConsentHeaders(guestId),
    model,
  );
  const covered = res.data?.success === true && res.data.data.covered === true;
  if (covered)
    cacheGuestEntry(guestCoverage, key, {
      expires: Date.now() + GUEST_CONSENT_TTL_MS,
    });
  return covered;
}

// The gateway delegates a guest's objection and consent to this check, since
// every guest shares one key; it has to run wherever a guest request reaches a
// model. Unlike the gateway it cannot route around the providers objected to,
// so an objection refuses the whole model.
export async function assertGuestOwnPurposeAccess(
  cookie: Record<string, Cookie<unknown>>,
  userId: number,
  model?: string,
) {
  if (userId !== GUEST_USER_ID || !model) return;
  const info = await getModelByName(model);
  if (!info) return;
  const guestId = readGuestId(cookie);
  if (
    usesInputsForOwnPurposes(info) &&
    guestId &&
    (await guestObjects(guestId))
  )
    throw new Error(msg("OWN_PURPOSE.OBJECTED_ERROR"));
  if (!info.own_purpose?.consent_required) return;
  if (!(await consentEnforcedFor([model, info.model_name]))) return;
  if (!guestId || !(await guestProviderCovered(guestId, model)))
    throw new Error(msg("CONSENT.DECLINED"));
}
