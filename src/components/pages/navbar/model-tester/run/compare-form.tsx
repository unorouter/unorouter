"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateTest } from "@/hooks/ai/model-tester/tester-hooks";
import { TESTER_CHECKS } from "@/lib/api/model-tester-rows";
import type { TranslationKey } from "@/lib/types";
import {
  VERIFY_PROVIDERS,
  type VerifyProviderValue,
} from "@/lib/validation/model-tester";
import { verify, type VerifyResult } from "ai-model-verifier";
import { wireForModel } from "ai-model-verifier/models";
import { useTranslations } from "next-intl";
import { Fragment, useState } from "react";
import { fromVerifyResult } from "../shared/result-adapters";
import { CONN_KEY, TestResultCard } from "../shared/test-result-card";

const INPUT_CLASS = "bg-muted/40 font-mono text-sm shadow-none";
// Parallel runs; more trips provider rate limits and the CORS proxy limit.
const CONCURRENCY = 3;

type CompareRow = {
  id: string;
  provider: VerifyProviderValue;
  baseUrl: string;
  apiKey: string;
  model: string;
};

type RowRun =
  | { state: "queued" }
  | { state: "running" }
  | { state: "done"; result: VerifyResult }
  | { state: "invalid" };

const FORMAT_LABEL: Record<VerifyProviderValue, TranslationKey> = {
  openai: "MODEL_TESTER.PROVIDER.OPENAI",
  anthropic: "MODEL_TESTER.PROVIDER.ANTHROPIC",
  gemini: "MODEL_TESTER.PROVIDER.GEMINI",
};

const VERDICT_LABEL: Record<VerifyResult["verdict"], TranslationKey> = {
  genuine: "MODEL_TESTER.VERDICT.GENUINE",
  suspicious: "MODEL_TESTER.VERDICT.SUSPICIOUS",
  unverified: "MODEL_TESTER.VERDICT.UNVERIFIED",
};

const VERDICT_RANK: Record<VerifyResult["verdict"], number> = {
  genuine: 0,
  unverified: 1,
  suspicious: 2,
};

const isProvider = (value: string): value is VerifyProviderValue =>
  VERIFY_PROVIDERS.some((p) => p === value);

function newRow(from?: CompareRow): CompareRow {
  return {
    id: crypto.randomUUID(),
    provider: from?.provider ?? "openai",
    baseUrl: from?.baseUrl ?? "",
    apiKey: from?.apiKey ?? "",
    model: "",
  };
}

// One endpoint per line: "url | key | model", or the same separated by spaces.
function parsePasted(text: string): CompareRow[] {
  const rows: CompareRow[] = [];
  for (const line of text.split("\n")) {
    const parts = line
      .split(/\s*\|\s*|\s+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length < 2) continue;
    const baseUrl = parts[0] ?? "";
    const model = parts.length >= 3 ? (parts[2] ?? "") : (parts[1] ?? "");
    const apiKey = parts.length >= 3 ? (parts[1] ?? "") : "";
    rows.push({
      id: crypto.randomUUID(),
      provider: wireForModel(model) ?? "openai",
      baseUrl,
      apiKey,
      model,
    });
  }
  return rows;
}

export function CompareForm() {
  const t = useTranslations();
  const createTest = useCreateTest();
  const [rows, setRows] = useState<CompareRow[]>([newRow()]);
  const [runs, setRuns] = useState<Record<string, RowRun>>({});
  const [running, setRunning] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  function updateRow(id: string, patch: Partial<CompareRow>) {
    setRows((current) =>
      current.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  }

  function setRun(id: string, run: RowRun) {
    setRuns((current) => ({ ...current, [id]: run }));
  }

  async function runOne(row: CompareRow) {
    setRun(row.id, { state: "running" });
    const input = {
      vendor: row.provider,
      baseUrl: row.baseUrl.trim().replace(/\/+$/, ""),
      apiKey: row.apiKey,
      model: row.model.trim(),
      serverProxyUrl: "/api/models/verify/probe",
      checks: TESTER_CHECKS,
    };
    let result = await verify({ ...input, mode: "direct" });
    // A batch has no one to click "test via backend", so a browser-blocked endpoint retries there.
    if (result.corsBlocked) result = await verify({ ...input, mode: "server" });
    setRun(row.id, { state: "done", result });
    if (!result.corsBlocked && !result.connectivityError)
      createTest.mutate({ result });
  }

  async function runAll() {
    const valid = rows.filter((r) => r.baseUrl.trim() && r.model.trim());
    const next: Record<string, RowRun> = {};
    for (const r of rows)
      next[r.id] = valid.includes(r)
        ? { state: "queued" }
        : { state: "invalid" };
    setRuns(next);
    setOpenId(null);
    setRunning(true);
    const queue = [...valid];
    const worker = async () => {
      for (let row = queue.shift(); row; row = queue.shift()) await runOne(row);
    };
    try {
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker),
      );
    } finally {
      setRunning(false);
    }
  }

  function applyPaste() {
    const parsed = parsePasted(pasteText);
    if (parsed.length === 0) return;
    setRows((current) => [
      ...current.filter((r) => r.baseUrl.trim() || r.model.trim()),
      ...parsed,
    ]);
    setPasteText("");
    setPasteOpen(false);
  }

  const finished = rows.filter((r) => runs[r.id]?.state === "done").length;
  const queued = rows.filter((r) => {
    const s = runs[r.id]?.state;
    return s === "queued" || s === "running" || s === "done";
  }).length;

  const ordered = [...rows].sort((a, b) => {
    const ra = runs[a.id];
    const rb = runs[b.id];
    const ka = ra?.state === "done" ? VERDICT_RANK[ra.result.verdict] : 9;
    const kb = rb?.state === "done" ? VERDICT_RANK[rb.result.verdict] : 9;
    if (ka !== kb) return ka - kb;
    const la = ra?.state === "done" ? ra.result.latencyMs : Infinity;
    const lb = rb?.state === "done" ? rb.result.latencyMs : Infinity;
    return la - lb;
  });
  const hasRuns = Object.keys(runs).length > 0;

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-card overflow-hidden rounded-lg border">
        <header className="flex items-center gap-2 px-4 py-3 sm:px-5">
          <Icon name="columns-3" className="text-primary size-4 shrink-0" />
          <div className="flex min-w-0 flex-col">
            <h2 className="text-foreground text-sm font-semibold">
              {t("MODEL_TESTER.COMPARE.TITLE")}
            </h2>
            <p className="text-muted-foreground text-xs">
              {t("MODEL_TESTER.COMPARE.DESC")}
            </p>
          </div>
        </header>
        <div className="flex flex-col gap-3 border-t px-4 py-4 sm:px-5">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className="grid gap-2 rounded-md border p-2 sm:grid-cols-[9rem_1fr_1fr_1fr_auto]"
            >
              <Select
                value={row.provider}
                onValueChange={(v) => {
                  if (typeof v === "string" && isProvider(v))
                    updateRow(row.id, { provider: v });
                }}
              >
                <SelectTrigger
                  className="w-full"
                  aria-label={t("MODEL_TESTER.FORM.PROVIDER")}
                >
                  <SelectValue>{t(FORMAT_LABEL[row.provider])}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {VERIFY_PROVIDERS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {t(FORMAT_LABEL[p])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={row.baseUrl}
                onChange={(e) => updateRow(row.id, { baseUrl: e.target.value })}
                placeholder="https://api.example.com"
                aria-label={t("MODEL_TESTER.FORM.BASE_URL")}
                className={INPUT_CLASS}
              />
              <Input
                type="password"
                value={row.apiKey}
                onChange={(e) => updateRow(row.id, { apiKey: e.target.value })}
                placeholder="sk-..."
                aria-label={t("MODEL_TESTER.FORM.API_KEY")}
                className={INPUT_CLASS}
              />
              <Input
                value={row.model}
                onChange={(e) => {
                  const model = e.target.value;
                  updateRow(row.id, {
                    model,
                    provider: wireForModel(model) ?? row.provider,
                  });
                }}
                placeholder="model-id"
                aria-label={t("MODEL_TESTER.FORM.MODEL")}
                className={INPUT_CLASS}
              />
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  title={t("MODEL_TESTER.COMPARE.DUPLICATE")}
                  aria-label={t("MODEL_TESTER.COMPARE.DUPLICATE")}
                  onClick={() =>
                    setRows((current) => [
                      ...current.slice(0, index + 1),
                      newRow(row),
                      ...current.slice(index + 1),
                    ])
                  }
                >
                  <Icon name="copy" className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={rows.length === 1}
                  title={t("MODEL_TESTER.COMPARE.REMOVE")}
                  aria-label={t("MODEL_TESTER.COMPARE.REMOVE")}
                  onClick={() =>
                    setRows((current) => current.filter((r) => r.id !== row.id))
                  }
                >
                  <Icon name="trash-2" className="size-4" />
                </Button>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setRows((current) => [...current, newRow(current.at(-1))])
              }
            >
              <Icon name="plus" className="size-4" />
              {t("MODEL_TESTER.COMPARE.ADD_ROW")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPasteOpen(!pasteOpen)}
            >
              <Icon name="clipboard-paste" className="size-4" />
              {t("MODEL_TESTER.COMPARE.PASTE")}
            </Button>
          </div>

          {pasteOpen ? (
            <div className="flex flex-col gap-2">
              <Textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={4}
                placeholder={"https://api.example.com | sk-... | glm-5.3"}
                className={INPUT_CLASS}
              />
              <p className="text-muted-foreground text-xs">
                {t("MODEL_TESTER.COMPARE.PASTE_HINT")}
              </p>
              <Button
                type="button"
                size="sm"
                className="w-fit"
                onClick={applyPaste}
              >
                {t("MODEL_TESTER.COMPARE.PASTE_APPLY")}
              </Button>
            </div>
          ) : null}

          <Button type="button" disabled={running} onClick={runAll}>
            <Icon
              name="refresh-cw"
              className={running ? "size-4 animate-spin" : "size-4"}
            />
            {running
              ? t("MODEL_TESTER.COMPARE.RUNNING", {
                  done: finished,
                  total: queued,
                })
              : t("MODEL_TESTER.COMPARE.RUN_ALL", { count: rows.length })}
          </Button>
          <p className="text-muted-foreground text-xs">
            {t("MODEL_TESTER.COMPARE.KEYS_LOCAL")}
          </p>
        </div>
      </section>

      {hasRuns ? (
        <section className="bg-card overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-left text-xs">
              <tr className="border-b">
                <th className="px-4 py-2 font-medium">
                  {t("MODEL_TESTER.COMPARE.COL_ENDPOINT")}
                </th>
                <th className="px-4 py-2 font-medium">
                  {t("MODEL_TESTER.COMPARE.COL_VERDICT")}
                </th>
                <th className="px-4 py-2 font-medium">
                  {t("MODEL_TESTER.COMPARE.COL_CHECKS")}
                </th>
                <th className="px-4 py-2 font-medium">
                  {t("MODEL_TESTER.COMPARE.COL_LATENCY")}
                </th>
                <th className="px-4 py-2 font-medium">
                  {t("MODEL_TESTER.COMPARE.COL_DETECTED")}
                </th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((row) => {
                const run = runs[row.id];
                if (!run) return null;
                const done = run.state === "done" ? run.result : null;
                const connKey = done?.connectivityError
                  ? CONN_KEY[done.connectivityError]
                  : undefined;
                return (
                  <Fragment key={row.id}>
                    <tr
                      className={
                        done
                          ? "hover:bg-muted/40 cursor-pointer border-b"
                          : "border-b"
                      }
                      onClick={() => {
                        if (done) setOpenId(openId === row.id ? null : row.id);
                      }}
                    >
                      <td className="px-4 py-2">
                        <div className="font-mono text-xs">
                          {row.model || "-"}
                        </div>
                        <div className="text-muted-foreground truncate font-mono text-[11px]">
                          {row.baseUrl.replace(/^https?:\/\//, "") || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        {run.state === "done" ? (
                          connKey ? (
                            <span className="text-destructive text-xs">
                              {t(connKey)}
                            </span>
                          ) : (
                            <Badge
                              variant={
                                run.result.verdict === "genuine"
                                  ? "default"
                                  : run.result.verdict === "suspicious"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {t(VERDICT_LABEL[run.result.verdict])}
                            </Badge>
                          )
                        ) : run.state === "invalid" ? (
                          <span className="text-muted-foreground text-xs">
                            {t("MODEL_TESTER.COMPARE.STATUS_INVALID")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                            {run.state === "running" ? (
                              <Icon
                                name="refresh-cw"
                                className="size-3 animate-spin"
                              />
                            ) : null}
                            {run.state === "running"
                              ? t("MODEL_TESTER.COMPARE.STATUS_RUNNING")
                              : t("MODEL_TESTER.COMPARE.STATUS_QUEUED")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">
                        {done
                          ? `${done.probesPassed}/${done.probesTotal}`
                          : "-"}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">
                        {done ? `${(done.latencyMs / 1000).toFixed(1)}s` : "-"}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">
                        {done?.detectedModel ?? "-"}
                      </td>
                    </tr>
                    {done && openId === row.id ? (
                      <tr className="border-b">
                        <td colSpan={5} className="p-3">
                          <TestResultCard
                            result={fromVerifyResult(done)}
                            defaultOpen
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
