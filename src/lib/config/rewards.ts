import { rec, recArr } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import { serverEnv } from "@/server/env";

// Numerals only: each locale writes its own currency symbol around the number.
export interface RewardAmounts {
  connectReward: string;
  voteReward: string;
  boostReward: string;
  inviteReward: string;
  tagReward: string;
  levelMin: string;
  levelMax: string;
  levelTotal: string;
  levels: { role: string; messages: string; reward: string }[];
}

interface RewardsResponse {
  amounts: {
    connect: number;
    vote: number;
    boost: number;
    invite: number;
    serverTag: number;
  };
  levels: { role: string; messages: number; dollars: number }[];
  levelTotal: number;
}

// Last-known-good, rendered only when the bot is unreachable. NOT the place to
// change a reward: the bot's env is the source of truth.
const FALLBACK: RewardsResponse = {
  amounts: {
    connect: 0.5,
    vote: 0.025,
    boost: 0.5,
    invite: 0.01,
    serverTag: 0.01,
  },
  levels: [
    { role: "Prompt Newbie!", messages: 10, dollars: 0.03 },
    { role: "Token Spender!", messages: 100, dollars: 0.05 },
    { role: "Context Filler!", messages: 500, dollars: 0.13 },
    { role: "Fine Tuner!", messages: 1000, dollars: 0.25 },
    { role: "Prompt Engineer!", messages: 2500, dollars: 0.5 },
    { role: "Model Wrangler!", messages: 5000, dollars: 1 },
    { role: "Agent Architect!", messages: 10000, dollars: 2.5 },
    { role: "RP Maestro!", messages: 25000, dollars: 5 },
    { role: "AGI Whisperer!", messages: 50000, dollars: 12.5 },
  ],
  levelTotal: 21.96,
};

// Keeps the cents pair a price expects (0.50, not 0.5) while still showing a
// third decimal when the amount has one (0.025).
function money(value: number, locale: string): string {
  const places = (String(value).split(".")[1] ?? "").length;
  const decimals = Math.min(3, Math.max(2, places));
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: Number.isInteger(value) ? 0 : decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// A partial payload would otherwise reach money() as undefined and throw during
// render instead of falling back.
function parseRewards(raw: unknown): RewardsResponse | null {
  const body = rec(raw);
  const amounts = body && rec(body.amounts);
  if (!body || !amounts) return null;
  const keys = ["connect", "vote", "boost", "invite", "serverTag"] as const;
  const out = { connect: 0, vote: 0, boost: 0, invite: 0, serverTag: 0 };
  for (const k of keys) {
    if (typeof amounts[k] !== "number") return null;
    out[k] = amounts[k];
  }
  const levels: RewardsResponse["levels"] = [];
  for (const l of recArr(body.levels)) {
    if (
      typeof l.role !== "string" ||
      typeof l.messages !== "number" ||
      typeof l.dollars !== "number"
    ) {
      return null;
    }
    levels.push({ role: l.role, messages: l.messages, dollars: l.dollars });
  }
  if (typeof body.levelTotal !== "number") return null;
  return { amounts: out, levels, levelTotal: body.levelTotal };
}

async function fetchRewards(): Promise<RewardsResponse> {
  try {
    const res = await fetch(`${serverEnv.botInternalUrl}/rewards`);
    if (!res.ok) throw new Error(`bot /rewards returned ${res.status}`);
    const parsed = parseRewards(await res.json());
    if (!parsed) throw new Error("bot /rewards returned an unexpected shape");
    return parsed;
  } catch (error) {
    logger.error("bot /rewards unreachable, serving fallback amounts", {
      context: "getRewardAmounts",
      error: String(error),
    });
    return FALLBACK;
  }
}

// Live from the bot, so changing a reward is a bot env change with no site
// deploy and no translation edits.
export async function getRewardAmounts(locale: string): Promise<RewardAmounts> {
  const data = await fetchRewards();
  const fmt = (value: number) => money(value, locale);
  const paid = data.levels.filter((level) => level.dollars > 0);

  return {
    connectReward: fmt(data.amounts.connect),
    voteReward: fmt(data.amounts.vote),
    boostReward: fmt(data.amounts.boost),
    inviteReward: fmt(data.amounts.invite),
    tagReward: fmt(data.amounts.serverTag),
    levelMin: fmt(paid[0]?.dollars ?? 0),
    levelMax: fmt(paid[paid.length - 1]?.dollars ?? 0),
    levelTotal: fmt(data.levelTotal),
    levels: data.levels.map((level) => ({
      role: level.role,
      messages: level.messages.toLocaleString(locale),
      reward: fmt(level.dollars),
    })),
  };
}
