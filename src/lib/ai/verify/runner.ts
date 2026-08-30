import { sleep } from "@/lib/utils/base";
import { echoesNonce, makeNonce } from "./nonce";
import { runHandshake } from "./handshake";
import { PROBES, type ProbeDef } from "./probes";
import { PROVIDER_CONFIGS, type ProviderConfig } from "./providers/config";
import { detectSignal, isTransientError } from "./signals";
import { probeTransport, type TransportFn } from "./transport";
import { aggregateVerdict, probeReason, type ProbeEval } from "./verdict";
import type {
  ProbeUsage,
  TransportMode,
  VerifyProvider,
  VerifyResult,
} from "./types";

const NONCE_MISMATCH_RETRIES = 2;
const NONCE_MISMATCH_BACKOFF_MS = 500;
const DEFAULT_TIMEOUT_MS = 30_000;
const RESPONSE_CAP = 2000;

const cap = (text: string) =>
  text.length > RESPONSE_CAP ? `${text.slice(0, RESPONSE_CAP)}...` : text;

async function runProbe(args: {
  probe: ProbeDef;
  cfg: ProviderConfig;
  baseUrl: string;
  apiKey: string;
  model: string;
  mode: TransportMode;
  timeoutMs: number;
  transport: TransportFn;
}): Promise<ProbeEval & { corsBlocked: boolean }> {
  const probe = args.probe;
  const started = performance.now();
  let lastPrompt = "";
  let weakNonce: {
    text: string;
    res: { data: unknown; status: number | null };
  } | null = null;

  for (let attempt = 0; attempt <= NONCE_MISMATCH_RETRIES; attempt++) {
    if (attempt > 0) await sleep(NONCE_MISMATCH_BACKOFF_MS);
    const nonce = makeNonce();
    lastPrompt = probe.buildPrompt(nonce);
    const built = args.cfg.buildRequest({
      baseUrl: args.baseUrl,
      apiKey: args.apiKey,
      model: args.model,
      prompt: lastPrompt,
      maxTokens: probe.maxTokens,
      direct: args.mode === "direct",
    });

    const res = await args.transport({
      mode: args.mode,
      url: built.url,
      headers: built.headers,
      reqBody: built.body,
      timeoutMs: args.timeoutMs,
    });

    if (res.error !== null) {
      const transient =
        res.corsBlocked ||
        isTransientError(res.error) ||
        (res.status !== null && isTransientError(`HTTP ${res.status}`));
      return {
        label: probe.label,
        pass: false,
        signal: null,
        muxFailure: false,
        transient,
        latencyMs: Math.round(performance.now() - started),
        prompt: lastPrompt,
        responseText: null,
        httpStatus: res.status,
        usage: null,
        detectedModel: null,
        reason: probeReason(false, null, false, transient),
        text: undefined,
        corsBlocked: res.corsBlocked,
      };
    }

    const text = args.cfg.extractText(res.data);
    if (text === null) {
      return {
        label: probe.label,
        pass: false,
        signal: null,
        muxFailure: false,
        transient: false,
        latencyMs: Math.round(performance.now() - started),
        prompt: lastPrompt,
        responseText: null,
        httpStatus: res.status,
        usage: null,
        detectedModel: null,
        reason: "upstream error envelope",
        text: undefined,
        corsBlocked: false,
      };
    }

    if (!echoesNonce(text, nonce)) {
      if (text.trim().length > 0)
        weakNonce = { text, res: { data: res.data, status: res.status } };
      continue; // retry for a clean nonce echo first
    }

    const signal = detectSignal(
      text,
      probe.label,
      args.cfg.foreignIdentityPatterns,
      args.cfg.cloudModelNamePatterns,
      args.cfg.acceptsCloudHostIdentity,
    );
    const meta = args.cfg.extractMeta(res.data);
    const pass = probe.evaluate(text, args.cfg);
    return {
      label: probe.label,
      pass,
      signal,
      muxFailure: false,
      transient: false,
      latencyMs: Math.round(performance.now() - started),
      prompt: lastPrompt,
      responseText: cap(text),
      httpStatus: res.status,
      usage: meta.usage,
      detectedModel: meta.detectedModel,
      reason: probeReason(pass, signal, false, false),
      text,
      corsBlocked: false,
    };
  }

  if (weakNonce) {
    const text = weakNonce.text;
    const signal = detectSignal(
      text,
      probe.label,
      args.cfg.foreignIdentityPatterns,
      args.cfg.cloudModelNamePatterns,
      args.cfg.acceptsCloudHostIdentity,
    );
    const meta = args.cfg.extractMeta(weakNonce.res.data);
    const pass = probe.evaluate(text, args.cfg);
    return {
      label: probe.label,
      pass,
      signal,
      muxFailure: false,
      transient: false,
      latencyMs: Math.round(performance.now() - started),
      prompt: lastPrompt,
      responseText: cap(text),
      httpStatus: weakNonce.res.status,
      usage: meta.usage,
      detectedModel: meta.detectedModel,
      reason: pass
        ? "passed (no nonce echo)"
        : probeReason(pass, signal, false, false),
      text,
      corsBlocked: false,
    };
  }

  return {
    label: probe.label,
    pass: false,
    signal: null,
    muxFailure: true,
    transient: false,
    latencyMs: Math.round(performance.now() - started),
    prompt: lastPrompt,
    responseText: null,
    httpStatus: null,
    usage: null,
    detectedModel: null,
    reason: probeReason(false, null, true, false),
    text: undefined,
    corsBlocked: false,
  };
}

function sumUsage(usages: (ProbeUsage | null)[]): ProbeUsage | null {
  const present = usages.filter((u): u is ProbeUsage => u !== null);
  if (present.length === 0) return null;
  const add = (key: keyof ProbeUsage) => {
    const vals = present
      .map((u) => u[key])
      .filter((v): v is number => v !== null);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) : null;
  };
  return {
    prompt: add("prompt"),
    completion: add("completion"),
    total: add("total"),
  };
}

function hostOf(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl;
  }
}

function connectivityResult(
  opts: {
    provider: VerifyProvider;
    model: string;
    baseUrl: string;
    mode: TransportMode;
  },
  error: NonNullable<VerifyResult["connectivityError"]>,
  corsBlocked: boolean,
  startedAt: number,
): VerifyResult {
  return {
    provider: opts.provider,
    model: opts.model,
    baseUrlHost: hostOf(opts.baseUrl),
    verdict: "unverified",
    versionUnverifiable: false,
    probes: [],
    reasons: [error],
    probesPassed: 0,
    probesTotal: 0,
    latencyMs: Math.round(performance.now() - startedAt),
    transport: opts.mode,
    corsBlocked,
    detectedModel: null,
    totalUsage: null,
    resolvedProvider: opts.provider,
    connectivityError: error,
  };
}

export async function runVerification(opts: {
  provider: VerifyProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
  mode: TransportMode;
  timeoutMs?: number;
  transport?: TransportFn;
}): Promise<VerifyResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const transport = opts.transport ?? probeTransport;
  const started = performance.now();

  const hs = await runHandshake({
    provider: opts.provider,
    baseUrl: opts.baseUrl,
    apiKey: opts.apiKey,
    model: opts.model,
    mode: opts.mode,
    timeoutMs,
    transport,
  });
  if (!hs.ok)
    return connectivityResult(opts, hs.reason, hs.corsBlocked, started);

  const resolvedProvider = hs.resolvedProvider;
  const cfg = PROVIDER_CONFIGS[resolvedProvider];
  const results = await Promise.all(
    PROBES.map((probe) =>
      runProbe({
        probe,
        cfg,
        baseUrl: opts.baseUrl,
        apiKey: opts.apiKey,
        model: opts.model,
        mode: hs.mode,
        timeoutMs,
        transport,
      }),
    ),
  );

  const verdict = aggregateVerdict({ model: opts.model, cfg, results });
  const corsBlocked =
    hs.mode === "direct" && results.some((r) => r.corsBlocked);

  return {
    provider: opts.provider,
    model: opts.model,
    baseUrlHost: hostOf(opts.baseUrl),
    verdict: verdict.verdict,
    versionUnverifiable: verdict.versionUnverifiable,
    probes: results.map((r) => ({
      label: r.label,
      pass: r.pass,
      signal: r.signal,
      muxFailure: r.muxFailure,
      transient: r.transient,
      latencyMs: r.latencyMs,
      prompt: r.prompt,
      responseText: r.responseText,
      httpStatus: r.httpStatus,
      usage: r.usage,
      detectedModel: r.detectedModel,
      reason: r.reason,
    })),
    reasons: verdict.reasons,
    probesPassed: results.filter((r) => r.pass).length,
    probesTotal: results.length,
    latencyMs: Math.round(performance.now() - started),
    transport: hs.mode,
    corsBlocked,
    detectedModel: results.find((r) => r.detectedModel)?.detectedModel ?? null,
    totalUsage: sumUsage(results.map((r) => r.usage)),
    resolvedProvider,
    connectivityError: null,
  };
}
