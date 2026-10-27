"use client";

import { MyFormError } from "@/components/elements/form/my-form-error";
import { MyFormInput } from "@/components/elements/form/my-form-input";
import { MyFormSwitch } from "@/components/elements/form/my-form-switch";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import {
  useCreateTest,
  useVerifyAndPublish,
} from "@/hooks/ai/model-tester/tester-hooks";
import { useRpForm } from "@/hooks/ui/use-rp-form";
import {
  CURATED_MODELS,
  makerForModel,
  wireForModel,
} from "ai-model-verifier/models";
import { MAKERS } from "ai-model-verifier/makers";
import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { verify, type VerifyResult } from "ai-model-verifier";
import {
  modelTesterForm,
  type ModelTesterForm,
} from "@/lib/validation/model-tester";
import { cn } from "@/lib/utils";
import { TESTER_CHECKS } from "@/lib/api/model-tester-rows";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { TranslationKey } from "@/lib/types";
import { Controller } from "react-hook-form";
import { ProviderCards } from "./provider-cards";
import { fromVerifyResult } from "../shared/result-adapters";
import { ScoreGauge, type GaugeArc } from "../shared/score-gauge";
import { CONN_KEY, TestResultCard } from "../shared/test-result-card";

const INPUT_CLASS = "bg-muted/40 font-mono text-sm shadow-none";

// Open-weight models are sold on the OpenAI chat format by their makers and by
// nearly every relay, so that format suggests them beside OpenAI's own.
const OPEN_WEIGHT_MODELS = [
  "glm-5.3",
  "kimi-k3",
  "deepseek-v4-pro",
  "qwen3.8-max",
  "minimax-m3",
  "grok-4.7",
  "mistral-large-4",
  "mimo-v2.6-pro",
];

const suggestionsFor = (format: ModelTesterForm["provider"]) =>
  format === "openai"
    ? [...CURATED_MODELS.openai, ...OPEN_WEIGHT_MODELS]
    : CURATED_MODELS[format];

const FORMAT_LABEL: Record<ModelTesterForm["provider"], TranslationKey> = {
  openai: "MODEL_TESTER.PROVIDER.OPENAI",
  anthropic: "MODEL_TESTER.PROVIDER.ANTHROPIC",
  gemini: "MODEL_TESTER.PROVIDER.GEMINI",
};

// Evidence rules judge the endpoint beside the probes; a fake can pass all four probes.
function evidenceFindings(
  result: VerifyResult | null,
  severity: "fail" | "inconclusive",
): number {
  if (!result) return 0;
  return result.findings.filter(
    (f) => f.severity === severity && f.layer === "evidence",
  ).length;
}

// A check that could not finish is not a pass: without its arc an unverified run read 100%.
function ruleChecks(result: VerifyResult | null): number {
  return (
    evidenceFindings(result, "fail") + evidenceFindings(result, "inconclusive")
  );
}

function gaugeArcs(result: VerifyResult | null, running: boolean): GaugeArc[] {
  if (running || !result) return ["pending", "pending", "pending", "pending"];
  if (result.probes.length === 0)
    return ["pending", "pending", "pending", "pending"];
  const probes: GaugeArc[] = result.probes.map((p) =>
    p.pass ? "pass" : "fail",
  );
  const failed: GaugeArc[] = Array.from(
    { length: evidenceFindings(result, "fail") },
    () => "fail",
  );
  const open: GaugeArc[] = Array.from(
    { length: evidenceFindings(result, "inconclusive") },
    () => "open",
  );
  return [...probes, ...failed, ...open];
}

export function TesterForm() {
  const t = useTranslations();
  const form = useRpForm(modelTesterForm, undefined);
  const createTest = useCreateTest();
  const verifyPublish = useVerifyAndPublish();
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [running, setRunning] = useState(false);
  const [corsBlocked, setCorsBlocked] = useState(false);
  const [publishMsg, setPublishMsg] = useState<string | null>(null);

  const publish = form.watch("publish");
  const watchedModel = form.watch("model");
  const watchedProvider = form.watch("provider");
  const inferredFmt = watchedModel ? wireForModel(watchedModel) : null;
  // A hint, never a block: relays serve Claude and Gemini on the OpenAI format too.
  const formatDiffers = inferredFmt !== null && inferredFmt !== watchedProvider;
  const makerId = watchedModel ? makerForModel(watchedModel) : null;
  const makerName = makerId
    ? (MAKERS.find((m) => m.id === makerId)?.name ?? makerId)
    : null;

  async function runLocal(values: ModelTesterForm, mode: "direct" | "server") {
    setRunning(true);
    setCorsBlocked(false);
    setPublishMsg(null);
    try {
      const r = await verify({
        vendor: values.provider,
        baseUrl: values.baseUrl.replace(/\/+$/, ""),
        apiKey: values.apiKey,
        model: values.model,
        mode,
        serverProxyUrl: "/api/models/verify/probe",
        checks: TESTER_CHECKS,
      });
      setResult(r);
      if (r.corsBlocked) {
        setCorsBlocked(true);
        return;
      }
      if (r.connectivityError) return;
      await createTest.mutateAsync({ result: r });
    } finally {
      setRunning(false);
    }
  }

  async function runVerifiedPublish(values: ModelTesterForm) {
    setRunning(true);
    setCorsBlocked(false);
    setResult(null);
    setPublishMsg(null);
    try {
      const res = await verifyPublish.mutateAsync({
        provider: values.provider,
        baseUrl: values.baseUrl,
        apiKey: values.apiKey,
        model: values.model,
      });
      // Checked before "result": a failed verification still returns its probe evidence.
      if ("error" in res && res.error) {
        if (res.result) setResult(res.result);
        if (res.error === "unverified-run")
          setPublishMsg(t("MODEL_TESTER.PUBLISH.UNVERIFIED_RUN"));
        else {
          const reasonKey = CONN_KEY[res.error];
          setPublishMsg(
            reasonKey
              ? `${t("MODEL_TESTER.PUBLISH.FAILED")} ${t(reasonKey)}`
              : t("MODEL_TESTER.PUBLISH.FAILED"),
          );
        }
      } else if ("deduped" in res && res.deduped)
        setPublishMsg(t("MODEL_TESTER.PUBLISH.DEDUPED"));
      else if ("result" in res && res.result) {
        setResult(res.result);
        setPublishMsg(
          res.published
            ? t("MODEL_TESTER.PUBLISH.DONE")
            : t("MODEL_TESTER.PUBLISH.NOT_SAVED"),
        );
      } else setPublishMsg(t("MODEL_TESTER.PUBLISH.FAILED"));
    } finally {
      setRunning(false);
    }
  }

  function onSubmit(values: ModelTesterForm) {
    return values.publish
      ? runVerifiedPublish(values)
      : runLocal(values, "direct");
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-card overflow-hidden rounded-lg border">
        <header className="flex items-center gap-2 px-4 py-3 sm:px-5">
          <Icon name="shield-check" className="text-primary size-4 shrink-0" />
          <div className="flex min-w-0 flex-col">
            <h2 className="text-foreground text-sm font-semibold">
              {t("MODEL_TESTER.FORM.SECTION_TITLE")}
            </h2>
            <p className="text-muted-foreground truncate text-xs">
              {t("MODEL_TESTER.FORM.SECTION_DESC")}
            </p>
          </div>
        </header>
        <div className="border-t px-4 py-4 sm:px-5">
          <Form {...form}>
            <form
              className="flex flex-col gap-4"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">
                  {t("MODEL_TESTER.FORM.PROVIDER")}
                </span>
                <Controller
                  control={form.control}
                  name="provider"
                  render={({ field }) => (
                    <ProviderCards
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <MyFormInput
                  control={form.control}
                  name="baseUrl"
                  schema={modelTesterForm}
                  label={t("MODEL_TESTER.FORM.BASE_URL")}
                  placeholder="https://api.example.com"
                  className={INPUT_CLASS}
                />
                <MyFormInput
                  control={form.control}
                  name="apiKey"
                  schema={modelTesterForm}
                  type="password"
                  label={t("MODEL_TESTER.FORM.API_KEY")}
                  placeholder="sk-..."
                  className={INPUT_CLASS}
                />
              </div>
              <Controller
                control={form.control}
                name="model"
                render={({ field, fieldState }) => (
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="tester-model"
                      className="text-sm font-medium"
                    >
                      {t("MODEL_TESTER.FORM.MODEL")}
                    </label>
                    <input
                      id="tester-model"
                      list="tester-model-options"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                      placeholder={
                        suggestionsFor(form.watch("provider"))[0] ?? "model-id"
                      }
                      className={cn(
                        "border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full min-w-0 rounded-md border px-2.5 py-1 text-sm transition-[color,box-shadow] outline-none focus-visible:ring-3 md:text-sm",
                        INPUT_CLASS,
                      )}
                    />
                    <datalist id="tester-model-options">
                      {suggestionsFor(form.watch("provider")).map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                    {watchedModel ? (
                      <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                        {makerId ? (
                          <VendorIcon
                            vendor={makerId}
                            size={14}
                            className="shrink-0"
                          />
                        ) : null}
                        {makerName
                          ? t("MODEL_TESTER.FORM.JUDGED_AS", {
                              maker: makerName,
                            })
                          : t("MODEL_TESTER.FORM.JUDGED_UNKNOWN", {
                              format: t(FORMAT_LABEL[watchedProvider]),
                            })}
                      </p>
                    ) : null}
                    <MyFormError
                      name="model"
                      schema={modelTesterForm}
                      error={fieldState.error?.message}
                    />
                  </div>
                )}
              />
              <MyFormSwitch
                control={form.control}
                name="publish"
                label={t("MODEL_TESTER.FORM.PUBLISH")}
                description={t("MODEL_TESTER.FORM.PUBLISH_HINT")}
              />

              {publish ? (
                <div className="flex flex-col gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                  <p className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                    <Icon name="triangle-alert" className="size-4" />
                    {t("MODEL_TESTER.PUBLISH.WARN_TITLE")}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {t("MODEL_TESTER.PUBLISH.WARN_BODY")}
                  </p>
                  <p className="text-muted-foreground text-xs font-medium">
                    {t("MODEL_TESTER.PUBLISH.WARN_THROWAWAY")}
                  </p>
                </div>
              ) : null}

              {formatDiffers && inferredFmt ? (
                <div className="flex flex-wrap items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                  <Icon name="info" className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    {t("MODEL_TESTER.FORM.FORMAT_HINT", {
                      model: watchedModel,
                      format: t(FORMAT_LABEL[inferredFmt]),
                    })}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => form.setValue("provider", inferredFmt)}
                  >
                    {t("MODEL_TESTER.FORM.FORMAT_SWITCH", {
                      format: t(FORMAT_LABEL[inferredFmt]),
                    })}
                  </Button>
                </div>
              ) : null}

              <Button type="submit" disabled={running} className="w-full">
                <Icon
                  name="refresh-cw"
                  className={running ? "size-4 animate-spin" : "size-4"}
                />
                {publish
                  ? t("MODEL_TESTER.FORM.RUN_PUBLISH")
                  : t("MODEL_TESTER.FORM.RUN")}
              </Button>
            </form>
          </Form>
        </div>
      </section>

      {publishMsg ? (
        <section className="bg-card overflow-hidden rounded-lg border px-5 py-4 text-sm">
          {publishMsg}
        </section>
      ) : null}

      {corsBlocked ? (
        <section className="bg-card flex flex-col gap-2 overflow-hidden rounded-lg border border-amber-500/40 px-5 py-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Icon name="triangle-alert" className="size-4 text-amber-500" />
            {t("MODEL_TESTER.FORM.CORS_TITLE")}
          </p>
          <p className="text-muted-foreground text-sm">
            {t("MODEL_TESTER.FORM.CORS_WARNING")}
          </p>
          <Button
            variant="outline"
            className="w-fit"
            disabled={running}
            onClick={() => runLocal(form.getValues(), "server")}
          >
            <Icon name="cloud-upload" className="size-4" />
            {t("MODEL_TESTER.FORM.RUN_BACKEND")}
          </Button>
        </section>
      ) : null}

      {(running || result) && !corsBlocked ? (
        <section className="bg-card flex items-center justify-center overflow-hidden rounded-lg border px-5 py-8">
          <ScoreGauge
            arcs={gaugeArcs(result, running)}
            running={running}
            passed={result?.probesPassed ?? 0}
            total={(result?.probesTotal ?? 0) + ruleChecks(result)}
            label={
              running
                ? t("MODEL_TESTER.GAUGE.RUNNING_HINT")
                : t("MODEL_TESTER.GAUGE.DONE_HINT")
            }
          />
        </section>
      ) : null}

      {result && !corsBlocked ? (
        <TestResultCard result={fromVerifyResult(result)} defaultOpen />
      ) : null}
    </div>
  );
}
