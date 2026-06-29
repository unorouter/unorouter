"use client";

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
import { CURATED_MODELS, providerForModel } from "@/lib/ai/verify/models";
import { runVerification } from "@/lib/ai/verify/runner";
import {
  modelTesterForm,
  type ModelTesterForm,
} from "@/lib/validation/model-tester";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { ProviderCards } from "./provider-cards";
import { fromVerifyResult } from "./result-adapters";
import { ScoreGauge, type GaugeArc } from "./score-gauge";
import { TestResultCard } from "./test-result-card";
import type { VerifyResult } from "@/lib/ai/verify/types";

// Compact filled field: a subtle surface + mono font for the technical values,
// without the airy default. Keeps the form dense on desktop and phone.
const INPUT_CLASS = "bg-muted/40 font-mono text-sm shadow-none";

// Map the finished probes to one gauge arc each so the ring shows WHICH checks
// passed. While running we have no probes yet, so show four pending arcs.
function gaugeArcs(result: VerifyResult | null, running: boolean): GaugeArc[] {
  if (running || !result) return ["pending", "pending", "pending", "pending"];
  if (result.probes.length === 0)
    return ["pending", "pending", "pending", "pending"];
  return result.probes.map((p) => (p.pass ? "pass" : "fail"));
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
  // Hard block: a model whose id resolves to a different format than the picked
  // one would fail every probe (wrong wire). Block the run instead.
  const inferredFmt = watchedModel ? providerForModel(watchedModel) : null;
  const formatMismatch = inferredFmt !== null && inferredFmt !== watchedProvider;

  // Local test: runs client-side, stays on device, never published.
  async function runLocal(values: ModelTesterForm, mode: "direct" | "server") {
    setRunning(true);
    setCorsBlocked(false);
    setPublishMsg(null);
    try {
      const r = await runVerification({
        provider: values.provider,
        baseUrl: values.baseUrl.replace(/\/+$/, ""),
        apiKey: values.apiKey,
        model: values.model,
        mode,
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

  // Server-verified publish: the backend runs the whole test with the key and
  // stores its own verdict (unforgeable). The user sees the server's result.
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
      if (res.published) {
        // Server-verified: show the full result and keep it locally too.
        setResult(res.result);
        setPublishMsg(t("MODEL_TESTER.PUBLISH.DONE"));
      } else if (res.deduped) setPublishMsg(t("MODEL_TESTER.PUBLISH.DEDUPED"));
      else setPublishMsg(t("MODEL_TESTER.PUBLISH.FAILED"));
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
                      onChange={(next) => {
                        field.onChange(next);
                        // Switching format clears a model that belongs to a
                        // different format, so a claude id can't sit under OpenAI.
                        const cur = form.getValues("model");
                        const fmt = cur ? providerForModel(cur) : null;
                        if (fmt && fmt !== next) form.setValue("model", "");
                      }}
                    />
                  )}
                />
              </div>
              {/* baseUrl + apiKey share a row on desktop, stack on phone. */}
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
              {/* Model is a curated list per format. Typing a known id auto-picks
                  the right format so a gpt id never runs on the Anthropic wire. */}
              <Controller
                control={form.control}
                name="model"
                render={({ field }) => (
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
                      onChange={(e) => {
                        const next = e.target.value;
                        field.onChange(next);
                        const fmt = providerForModel(next);
                        if (fmt && fmt !== form.getValues("provider"))
                          form.setValue("provider", fmt);
                      }}
                      placeholder={
                        CURATED_MODELS[form.watch("provider")][0] ?? "model-id"
                      }
                      className={cn(
                        "border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full min-w-0 rounded-md border px-2.5 py-1 text-sm transition-[color,box-shadow] outline-none focus-visible:ring-3 md:text-sm",
                        INPUT_CLASS,
                      )}
                    />
                    <datalist id="tester-model-options">
                      {CURATED_MODELS[form.watch("provider")].map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
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

              {formatMismatch ? (
                <p className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <Icon name="triangle-alert" className="size-4 shrink-0" />
                  {t("MODEL_TESTER.FORM.FORMAT_MISMATCH", {
                    model: watchedModel,
                    format: inferredFmt ?? "",
                  })}
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={running || formatMismatch}
                className="w-full"
              >
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
            total={result?.probesTotal ?? 0}
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
