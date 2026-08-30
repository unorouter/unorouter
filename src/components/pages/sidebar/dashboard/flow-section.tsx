"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardFlowQuery } from "@/hooks/billing/dashboard-hook";
import { useDashboardData } from "@/hooks/ui/use-dashboard-data";
import type { FlowRow } from "@/lib/api/typebox/dashboard";
import { modelColor } from "@/lib/utils/format/color";
import { quotaToDollars } from "@/lib/config/constants";
import { formatPrice } from "@/lib/utils/format/number";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  Layer,
  Rectangle,
  ResponsiveContainer,
  Sankey,
  Tooltip,
} from "recharts";
import { PanelEmpty } from "./panel";
import { SectionCard } from "./section-card";

const METRICS = ["quota", "tokens", "requests"] as const;
type FlowMetric = (typeof METRICS)[number];

type SankeyNode = { name: string };
type SankeyLink = { source: number; target: number; value: number };

function measure(row: FlowRow, metric: FlowMetric) {
  if (metric === "tokens") return row.token_used ?? 0;
  if (metric === "requests") return row.count ?? 0;
  return row.quota ?? 0;
}

// Stages are key -> group -> model. Channel is dropped: the self endpoint does
// not return channel_id, so a channel stage would collapse to one "unknown".
function buildSankey(
  rows: FlowRow[],
  metric: FlowMetric,
  deletedKeyLabel: string,
) {
  const nodes: SankeyNode[] = [];
  const indexByName = new Map<string, number>();
  const linkTotals = new Map<string, number>();

  function nodeIndex(name: string) {
    const existing = indexByName.get(name);
    if (existing !== undefined) return existing;
    const index = nodes.length;
    indexByName.set(name, index);
    nodes.push({ name });
    return index;
  }

  function addLink(source: string, target: string, value: number) {
    if (value <= 0) return;
    // Index here, not when emitting: node order is the band layout.
    const key = `${nodeIndex(source)},${nodeIndex(target)}`;
    linkTotals.set(key, (linkTotals.get(key) ?? 0) + value);
  }

  for (const row of rows) {
    const value = measure(row, metric);
    if (value <= 0) continue;
    // Rows logged before per-token attribution carry token_id 0 and no name.
    const key =
      row.token_name || (row.token_id ? `#${row.token_id}` : deletedKeyLabel);
    const group = row.use_group || "default";
    const model = row.model_name || "unknown";
    addLink(key, group, value);
    addLink(group, model, value);
  }

  const links: SankeyLink[] = [];
  for (const [key, value] of linkTotals) {
    const [source, target] = key.split(",");
    links.push({ source: Number(source), target: Number(target), value });
  }

  return { nodes, links };
}

export function FlowSection() {
  const t = useTranslations();
  const dashboard = useDashboardData();
  const [metric, setMetric] = useState<FlowMetric>("quota");

  const flowQuery = useDashboardFlowQuery({
    start_timestamp: dashboard.startTs,
    end_timestamp: dashboard.endTs,
  });

  const rows = flowQuery.data ?? [];
  const graph = buildSankey(rows, metric, t("DASHBOARD.FLOW.UNTRACKED_KEY"));
  const hasGraph = graph.nodes.length > 1 && graph.links.length > 0;

  function formatValue(value: number) {
    if (metric === "quota") return formatPrice(quotaToDollars(value));
    return value.toLocaleString();
  }

  return (
    <SectionCard
      title={t("DASHBOARD.SECTION.FLOW")}
      subtitle={t("DASHBOARD.FLOW.DESC")}
      icon="shuffle"
      action={
        <Tabs
          value={metric}
          onValueChange={(next) => setMetric(next as FlowMetric)}
        >
          <TabsList variant="line" className="h-7">
            {METRICS.map((value) => (
              <TabsTrigger
                key={value}
                value={value}
                className="font-mono text-[10px]"
              >
                {t(
                  `DASHBOARD.FLOW.${value.toUpperCase() as Uppercase<FlowMetric>}`,
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      }
    >
      {flowQuery.isLoading ? (
        <div className="p-5">
          <Skeleton className="h-80 w-full" />
        </div>
      ) : !hasGraph ? (
        <PanelEmpty icon="shuffle" label={t("DASHBOARD.NO_DATA")} />
      ) : (
        <div className="p-5">
          <ResponsiveContainer
            width="100%"
            height={Math.max(360, graph.nodes.length * 22)}
          >
            <Sankey
              data={graph}
              nodePadding={18}
              nodeWidth={12}
              margin={{ top: 8, right: 170, bottom: 8, left: 8 }}
              link={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.35 }}
              node={<FlowNode />}
            >
              <Tooltip
                formatter={(value: number) => formatValue(value)}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  fontFamily: "monospace",
                  fontSize: 11,
                }}
              />
            </Sankey>
          </ResponsiveContainer>
        </div>
      )}
    </SectionCard>
  );
}

type FlowNodeProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: { name?: string };
};

function FlowNode(props: FlowNodeProps) {
  const x = props.x ?? 0;
  const y = props.y ?? 0;
  const width = props.width ?? 0;
  const height = props.height ?? 0;
  const name = props.payload?.name ?? "";

  return (
    <Layer>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={modelColor(name)}
        fillOpacity={0.9}
      />
      <text
        x={x + width + 6}
        y={y + height / 2}
        dominantBaseline="middle"
        fontSize={10}
        fontFamily="monospace"
        fill="var(--muted-foreground)"
      >
        {name.length > 22 ? `${name.slice(0, 22)}...` : name}
      </text>
    </Layer>
  );
}
