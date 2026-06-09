// Tiered billing expression parser; ported from QuantumNous/new-api (AGPL-3.0).
// Parses billing_mode=tiered_expr -> ParsedTier[]; unknown -> [].

export type BillingVar = {
  key: string;
  field: string | null;
  label: string;
  shortLabel: string;
  side: "input" | "output" | "condition";
  isBase?: boolean;
  isConditionOnly?: boolean;
  group?: string;
};

export const BILLING_VARS: BillingVar[] = [
  {
    key: "p",
    field: "inputPrice",
    label: "Input price",
    shortLabel: "Input",
    side: "input",
    isBase: true,
  },
  {
    key: "c",
    field: "outputPrice",
    label: "Completion price",
    shortLabel: "Output",
    side: "output",
    isBase: true,
  },
  {
    key: "len",
    field: null,
    label: "Input length",
    shortLabel: "Length",
    side: "condition",
    isConditionOnly: true,
  },
  {
    key: "cr",
    field: "cacheReadPrice",
    label: "Cache read price",
    shortLabel: "Cache Read",
    side: "input",
    group: "cache",
  },
  {
    key: "cc",
    field: "cacheCreatePrice",
    label: "Cache create price",
    shortLabel: "Cache Write",
    side: "input",
    group: "cache",
  },
  {
    key: "cc1h",
    field: "cacheCreate1hPrice",
    label: "Cache create (1h) price",
    shortLabel: "Cache Write (1h)",
    side: "input",
    group: "cache",
  },
  {
    key: "img",
    field: "imagePrice",
    label: "Image input price",
    shortLabel: "Image In",
    side: "input",
    group: "media",
  },
  {
    key: "img_o",
    field: "imageOutputPrice",
    label: "Image output price",
    shortLabel: "Image Out",
    side: "output",
    group: "media",
  },
  {
    key: "ai",
    field: "audioInputPrice",
    label: "Audio input price",
    shortLabel: "Audio In",
    side: "input",
    group: "media",
  },
  {
    key: "ao",
    field: "audioOutputPrice",
    label: "Audio output price",
    shortLabel: "Audio Out",
    side: "output",
    group: "media",
  },
];

export const BILLING_PRICING_VARS: BillingVar[] = BILLING_VARS.filter(
  (v) => !v.isConditionOnly,
);

const BILLING_VAR_KEY_TO_FIELD = Object.fromEntries(
  BILLING_PRICING_VARS.map((v) => [v.key, v.field as string]),
) as Record<string, string>;

const BILLING_VAR_REGEX = new RegExp(
  `\\b(${BILLING_PRICING_VARS.map((v) => v.key).join("|")})\\s*\\*\\s*([\\d.eE+-]+)`,
  "g",
);

export type TierCondition = {
  var: "p" | "c" | "len";
  op: "<" | "<=" | ">" | ">=";
  value: number;
};

export type ParsedTier = {
  label: string;
  conditions: TierCondition[];
  [field: string]: unknown;
};

function stripExprVersion(exprStr: string): { version: number; body: string } {
  if (!exprStr) return { version: 1, body: "" };
  const m = exprStr.match(/^v(\d+):([\s\S]*)$/);
  if (m) return { version: Number(m[1]), body: m[2] };
  return { version: 1, body: exprStr };
}

function parseTierBody(bodyStr: string): Record<string, number> {
  const coeffs: Record<string, number> = {};
  const re = new RegExp(BILLING_VAR_REGEX.source, "g");
  let m;
  while ((m = re.exec(bodyStr)) !== null) {
    if (!(m[1] in coeffs)) coeffs[m[1]] = Number(m[2]);
  }
  const tier: Record<string, number> = {};
  for (const [varName, field] of Object.entries(BILLING_VAR_KEY_TO_FIELD)) {
    tier[field] = coeffs[varName] || 0;
  }
  return tier;
}

export function parseTiersFromExpr(exprStr: string): ParsedTier[] {
  if (!exprStr) return [];
  try {
    const stripped = stripExprVersion(exprStr);
    const body = stripped.body;
    const condGroup =
      `((?:(?:p|c|len)\\s*(?:<|<=|>|>=)\\s*[\\d.eE+]+)` +
      `(?:\\s*&&\\s*(?:p|c|len)\\s*(?:<|<=|>|>=)\\s*[\\d.eE+]+)*)`;
    const tierRe = new RegExp(
      `(?:${condGroup}\\s*\\?\\s*)?tier\\("([^"]*)",\\s*([^)]+)\\)`,
      "g",
    );
    const tiers: ParsedTier[] = [];
    let m;
    while ((m = tierRe.exec(body)) !== null) {
      const condStr = m[1] || "";
      const conditions: TierCondition[] = [];
      if (condStr) {
        for (const cp of condStr.split(/\s*&&\s*/)) {
          const cm = cp.trim().match(/^(p|c|len)\s*(<|<=|>|>=)\s*([\d.eE+]+)$/);
          if (cm) {
            conditions.push({
              var: cm[1] as TierCondition["var"],
              op: cm[2] as TierCondition["op"],
              value: Number(cm[3]),
            });
          }
        }
      }
      const tier = parseTierBody(m[3]) as ParsedTier;
      tier.label = m[2];
      tier.conditions = conditions;
      tiers.push(tier);
    }
    return tiers;
  } catch {
    return [];
  }
}

const QUOTA_TO_USD = 2;

export type TierPriceRow = {
  label: string;
  inputPrice: number;
  outputPrice: number;
  cacheReadPrice: number;
  cacheCreatePrice: number;
};

export function tierDisplayPrices(
  tier: ParsedTier,
  minRatio: number,
): TierPriceRow {
  return {
    label: tier.label,
    inputPrice: ((tier.inputPrice as number) ?? 0) * QUOTA_TO_USD * minRatio,
    outputPrice: ((tier.outputPrice as number) ?? 0) * QUOTA_TO_USD * minRatio,
    cacheReadPrice:
      ((tier.cacheReadPrice as number) ?? 0) * QUOTA_TO_USD * minRatio,
    cacheCreatePrice:
      ((tier.cacheCreatePrice as number) ?? 0) * QUOTA_TO_USD * minRatio,
  };
}

export function parseTiersWithFallback(expr: string): {
  tiers: ParsedTier[];
  isSpecial: boolean;
} {
  const tiers = parseTiersFromExpr(expr);
  return { tiers, isSpecial: tiers.length === 0 };
}

export function computeMinGroupRatio(
  enableGroups: string[],
  groupRatioMap: Record<string, number>,
): number {
  if (enableGroups.length === 0) return 1;
  let min = Number.POSITIVE_INFINITY;
  for (const g of enableGroups) {
    const r = groupRatioMap[g];
    if (r !== undefined && r < min) min = r;
  }
  return min === Number.POSITIVE_INFINITY ? 1 : min;
}
