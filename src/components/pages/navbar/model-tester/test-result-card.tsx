"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { highlightSpans } from "@/lib/ai/verify/highlight";
import type { HighlightKind } from "@/lib/ai/verify/highlight";
import { vendorForRow } from "@/lib/ai/verify/models";
import { ruleIdForSignal } from "@/lib/ai/verify/rules";
import type {
  ProbeLabel,
  ProbeSignal,
  VerifyProvider,
} from "@/lib/ai/verify/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { TranslationKey } from "@/lib/types";

// Unified shape both the live VerifyResult and a stored test+probes map into.
export type ResultProbe = {
  label: string;
  pass: boolean;
  signal: string | null;
  reason: string | null;
  prompt: string;
  responseText: string | null;
  httpStatus: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
  latencyMs: number;
};

export type ResultCardData = {
  model: string;
  baseUrlHost: string;
  provider: VerifyProvider;
  verdict: "genuine" | "suspicious" | "unverified";
  reasons: string[];
  versionUnverifiable: boolean;
  detectedModel: string | null;
  probesPassed: number;
  probesTotal: number;
  totalTokens: number | null;
  latencyMs: number;
  transport: string;
  resolvedFormat: string;
  formatFellBack: boolean;
  connectivityError: string | null;
  probes: ResultProbe[];
};

type VerdictTone = {
  badge: "default" | "destructive" | "secondary";
  icon: string;
  labelKey: TranslationKey;
};

const VERDICT_TONE: Record<ResultCardData["verdict"], VerdictTone> = {
  genuine: {
    badge: "default",
    icon: "shield-check",
    labelKey: "MODEL_TESTER.VERDICT.GENUINE",
  },
  suspicious: {
    badge: "destructive",
    icon: "triangle-alert",
    labelKey: "MODEL_TESTER.VERDICT.SUSPICIOUS",
  },
  unverified: {
    badge: "secondary",
    icon: "circle-help",
    labelKey: "MODEL_TESTER.VERDICT.UNVERIFIED",
  },
};

const PROBE_KEY: Record<string, TranslationKey> = {
  emotional: "MODEL_TESTER.PROBE.EMOTIONAL",
  creative: "MODEL_TESTER.PROBE.CREATIVE",
  identity: "MODEL_TESTER.PROBE.IDENTITY",
  "model-name": "MODEL_TESTER.PROBE.MODEL-NAME",
};

const CONN_KEY: Record<string, TranslationKey> = {
  "cors-needs-backend": "MODEL_TESTER.CONNECTIVITY.CORS",
  unreachable: "MODEL_TESTER.CONNECTIVITY.UNREACHABLE",
  "invalid-key": "MODEL_TESTER.CONNECTIVITY.INVALID_KEY",
  "no-format": "MODEL_TESTER.CONNECTIVITY.NO_FORMAT",
};

// Inline rule explanation keyed by the rule a probe signal maps to.
const RULE_TITLE_KEY: Record<string, TranslationKey> = {
  "coding-tool": "MODEL_TESTER.RULES.CODING-TOOL.TITLE",
  scam: "MODEL_TESTER.RULES.SCAM.TITLE",
  "cjk-leak": "MODEL_TESTER.RULES.CJK-LEAK.TITLE",
  foreign: "MODEL_TESTER.RULES.FOREIGN.TITLE",
};
const RULE_WHY_KEY: Record<string, TranslationKey> = {
  "coding-tool": "MODEL_TESTER.RULES.CODING-TOOL.WHY",
  scam: "MODEL_TESTER.RULES.SCAM.WHY",
  "cjk-leak": "MODEL_TESTER.RULES.CJK-LEAK.WHY",
  foreign: "MODEL_TESTER.RULES.FOREIGN.WHY",
};

// Per-highlight-kind color + legend label.
const HIGHLIGHT_CLASS: Record<NonNullable<HighlightKind>, string> = {
  foreign:
    "rounded-sm bg-destructive/15 text-destructive px-0.5 font-medium dark:bg-destructive/25",
  "coding-tool":
    "rounded-sm bg-destructive/15 text-destructive px-0.5 font-medium dark:bg-destructive/25",
  scam: "rounded-sm bg-destructive/15 text-destructive px-0.5 font-medium dark:bg-destructive/25",
  cjk: "rounded-sm bg-amber-500/20 px-0.5 font-medium text-amber-700 dark:text-amber-400",
  home: "rounded-sm bg-emerald-500/20 px-0.5 font-medium text-emerald-700 dark:text-emerald-400",
};

const LEGEND_KEY: Record<NonNullable<HighlightKind>, TranslationKey> = {
  foreign: "MODEL_TESTER.RESULT.HIGHLIGHT_LEGEND.FOREIGN",
  "coding-tool": "MODEL_TESTER.RESULT.HIGHLIGHT_LEGEND.CODING_TOOL",
  scam: "MODEL_TESTER.RESULT.HIGHLIGHT_LEGEND.SCAM",
  cjk: "MODEL_TESTER.RESULT.HIGHLIGHT_LEGEND.CJK",
  home: "MODEL_TESTER.RESULT.HIGHLIGHT_LEGEND.HOME",
};

function HighlightedResponse(props: {
  text: string;
  provider: VerifyProvider;
  label: string;
}) {
  const t = useTranslations();
  const segments = highlightSpans(
    props.text,
    props.provider,
    props.label as ProbeLabel,
  );
  const kinds = Array.from(
    new Set(segments.map((s) => s.kind).filter((k): k is NonNullable<HighlightKind> => k !== null)),
  );

  return (
    <div className="flex flex-col gap-1">
      {kinds.length > 0 ? (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {kinds.map((kind) => (
            <span
              key={kind}
              className="text-muted-foreground inline-flex items-center gap-1 text-[10px]"
            >
              <span className={cn("size-2 rounded-full", HIGHLIGHT_CLASS[kind])} />
              {t(LEGEND_KEY[kind])}
            </span>
          ))}
        </div>
      ) : null}
      <pre className="bg-muted/50 max-h-48 overflow-auto rounded-md p-2 font-mono text-[11px] whitespace-pre-wrap">
        {segments.map((seg, i) =>
          seg.kind ? (
            <mark key={i} className={cn("bg-transparent", HIGHLIGHT_CLASS[seg.kind])}>
              {seg.text}
            </mark>
          ) : (
            <span key={i}>{seg.text}</span>
          ),
        )}
      </pre>
    </div>
  );
}

function ProbeRow(props: { probe: ResultProbe; provider: VerifyProvider }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const probe = props.probe;
  const labelKey = PROBE_KEY[probe.label];
  const ruleId = probe.signal
    ? ruleIdForSignal(probe.signal as ProbeSignal)
    : null;
  const ruleTitleKey = ruleId ? RULE_TITLE_KEY[ruleId] : undefined;
  const ruleWhyKey = ruleId ? RULE_WHY_KEY[ruleId] : undefined;

  return (
    <div className="border-border/60 rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-muted/40 flex w-full items-center justify-between gap-2 px-3 py-2 text-sm"
      >
        <span className="flex items-center gap-2">
          <Icon
            name={probe.pass ? "circle-check" : "circle-x"}
            className={cn(
              "size-4",
              probe.pass ? "text-emerald-500" : "text-destructive",
            )}
          />
          {labelKey ? t(labelKey) : probe.label}
        </span>
        <span className="text-muted-foreground flex items-center gap-3">
          {probe.signal ? <span>{probe.signal}</span> : null}
          <span>{probe.latencyMs}ms</span>
          <Icon
            name={open ? "chevrons-up-down" : "chevron-down"}
            className="size-4"
          />
        </span>
      </button>

      {open ? (
        <div className="border-border/60 flex flex-col gap-3 border-t px-3 py-3 text-xs">
          <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
            <span>
              {t("MODEL_TESTER.PROBE_DETAIL.STATUS")}: {probe.httpStatus ?? "-"}
            </span>
            <span>
              {t("MODEL_TESTER.PROBE_DETAIL.TOKENS")}:{" "}
              {probe.promptTokens ?? "-"} / {probe.completionTokens ?? "-"}
            </span>
            {probe.reason ? (
              <span>
                {t("MODEL_TESTER.PROBE_DETAIL.REASON")}: {probe.reason}
              </span>
            ) : null}
          </div>

          {ruleTitleKey && ruleWhyKey ? (
            <div className="border-border/60 bg-muted/30 flex flex-col gap-1 rounded-md border p-2">
              <span className="text-foreground inline-flex items-center gap-1.5 font-medium">
                <Icon name="triangle-alert" className="text-destructive size-3.5" />
                {t(ruleTitleKey)}
              </span>
              <span className="text-muted-foreground">{t(ruleWhyKey)}</span>
            </div>
          ) : null}

          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground font-medium">
              {t("MODEL_TESTER.PROBE_DETAIL.PROMPT")}
            </span>
            <pre className="bg-muted/50 max-h-40 overflow-auto rounded-md p-2 font-mono text-[11px] whitespace-pre-wrap">
              {probe.prompt}
            </pre>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground font-medium">
              {t("MODEL_TESTER.PROBE_DETAIL.RESPONSE")}
            </span>
            {probe.responseText ? (
              <HighlightedResponse
                text={probe.responseText}
                provider={props.provider}
                label={probe.label}
              />
            ) : (
              <pre className="bg-muted/50 max-h-48 overflow-auto rounded-md p-2 font-mono text-[11px] whitespace-pre-wrap">
                {t("MODEL_TESTER.PROBE_DETAIL.NO_RESPONSE")}
              </pre>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function TestResultCard(props: { result: ResultCardData }) {
  const t = useTranslations();
  const result = props.result;
  const tone = VERDICT_TONE[result.verdict];
  const evidence = result.reasons.filter(Boolean);

  return (
    <section className="bg-card overflow-hidden rounded-lg border">
      <header className="flex flex-row items-center justify-between gap-3 px-5 py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <VendorIcon
            vendor={vendorForRow(result.provider, result.model)}
            size={22}
            className="shrink-0"
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-base font-semibold">
              {result.model}
            </span>
            <span className="text-muted-foreground truncate text-sm">
              {result.baseUrlHost}
            </span>
          </div>
        </div>
        <Badge variant={tone.badge} className="shrink-0 gap-1.5">
          <Icon name={tone.icon} className="size-3.5" />
          {t(tone.labelKey)}
        </Badge>
      </header>
      <div className="flex flex-col gap-4 border-t px-5 py-5">
        {evidence.length > 0 ? (
          <div className="border-border/60 bg-muted/30 flex flex-col gap-1 rounded-md border px-3 py-2">
            <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {t("MODEL_TESTER.RESULT.EVIDENCE")}
            </span>
            {evidence.map((line, i) => (
              <span key={i} className="font-mono text-xs">
                {line}
              </span>
            ))}
          </div>
        ) : null}

        <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span>
            {t("MODEL_TESTER.RESULT.PASSED", {
              passed: result.probesPassed,
              total: result.probesTotal,
            })}
          </span>
          <span>
            {t("MODEL_TESTER.RESULT.LATENCY", { ms: result.latencyMs })}
          </span>
          <span>
            {t("MODEL_TESTER.RESULT.TRANSPORT", { mode: result.transport })}
          </span>
          {result.totalTokens !== null ? (
            <span>
              {t("MODEL_TESTER.RESULT.TOTAL_TOKENS", {
                tokens: result.totalTokens,
              })}
            </span>
          ) : null}
        </div>

        {result.connectivityError ? (
          <p className="text-destructive flex items-center gap-2 text-sm">
            <Icon name="triangle-alert" className="size-4" />
            {t(
              CONN_KEY[result.connectivityError] ??
                "MODEL_TESTER.CONNECTIVITY.UNREACHABLE",
            )}
          </p>
        ) : null}

        {result.formatFellBack ? (
          <p className="text-muted-foreground text-sm">
            {t("MODEL_TESTER.RESULT.FORMAT_FELL_BACK", {
              format: result.resolvedFormat,
            })}
          </p>
        ) : null}

        {result.detectedModel ? (
          <div className="text-sm">
            {t("MODEL_TESTER.RESULT.DETECTED_MODEL")}:{" "}
            <span className="font-mono">{result.detectedModel}</span>
          </div>
        ) : null}

        {result.versionUnverifiable ? (
          <p className="text-muted-foreground text-sm">
            {t("MODEL_TESTER.VERDICT.VERSION_UNVERIFIABLE")}
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          {result.probes.map((probe, i) => (
            <ProbeRow
              key={`${probe.label}-${i}`}
              probe={probe}
              provider={result.provider}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
