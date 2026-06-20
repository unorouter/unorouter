import type {
  StatusBarData,
  StatusEventType,
  StatusType,
} from "@/components/ui/status/status.types";
import { dayjs } from "@/lib/utils/format/date";

type CompactBucket = [
  number, // ok
  number, // degraded
  number, // err
  number, // empty
  number, // reqSum
  number, // errSum
  number, // p95
];

type CompactBar = {
  buckets: CompactBucket[];
  events?: Record<string, number[]>;
};

type IncidentDTO = {
  id: number;
  name: string;
  type: StatusEventType;
  from: string;
  to: string | null;
  is_aggregated?: boolean;
};

type ComponentDTO = {
  id: number;
  name: string;
  description: string;
  group_id?: number | null;
  status: string;
  up_channels: number;
  total_channels: number;
  probe_latency_ms: number;
  uptime_24h: number;
  uptime_30d: number;
  open_incident_id?: number | null;
  sampled_at: number;
};

export type CompactPagePayload = {
  components: ComponentDTO[];
  incidents: IncidentDTO[];
  bucket_start: number;
  bucket_sec: number;
  bucket_count: number;
  bars: Record<string, CompactBar>;
};

type DecodedStatusPage = {
  components: ComponentDTO[];
  incidents: IncidentDTO[];
  bars: Record<string, StatusBarData[]>;
};

const STATUS_SUCCESS: StatusType = "success";
const STATUS_DEGRADED: StatusType = "degraded";
const STATUS_ERROR: StatusType = "error";
const STATUS_EMPTY: StatusType = "empty";

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function buildBar(b: CompactBucket): StatusBarData["bar"] {
  const ok = b[0];
  const deg = b[1];
  const err = b[2];
  const empty = b[3];
  const count = ok + deg + err + empty;
  if (count === 0) return [{ status: STATUS_EMPTY, height: 100 }];
  const pct = (n: number) => Math.floor((n * 100) / count);
  const segs: StatusBarData["bar"] = [];
  const h1 = pct(ok);
  if (h1 > 0) segs.push({ status: STATUS_SUCCESS, height: h1 });
  const h2 = pct(deg);
  if (h2 > 0) segs.push({ status: STATUS_DEGRADED, height: h2 });
  const h3 = pct(err);
  if (h3 > 0) segs.push({ status: STATUS_ERROR, height: h3 });
  const h4 = pct(empty);
  if (h4 > 0) segs.push({ status: STATUS_EMPTY, height: h4 });
  if (segs.length > 0) {
    let sum = 0;
    for (const s of segs) sum += s.height;
    const diff = 100 - sum;
    if (diff !== 0) segs[segs.length - 1].height += diff;
  }
  return segs;
}

function buildCard(b: CompactBucket): StatusBarData["card"] {
  const ok = b[0];
  const deg = b[1];
  const err = b[2];
  const reqSum = b[4];
  const errSum = b[5];
  const p95 = b[6];
  const items: StatusBarData["card"] = [];
  if (ok > 0) items.push({ status: STATUS_SUCCESS, value: `${ok} min` });
  if (deg > 0) items.push({ status: STATUS_DEGRADED, value: `${deg} min` });
  if (err > 0) items.push({ status: STATUS_ERROR, value: `${err} min` });
  if (reqSum > 0 || errSum > 0) {
    const latency = p95 > 0 ? ` / p95 ${formatMs(p95)}` : "";
    items.push({
      status: STATUS_SUCCESS,
      value: `${reqSum} req / ${errSum} err${latency}`,
    });
  }
  return items;
}

export function decodeCompactPage(p: CompactPagePayload): DecodedStatusPage {
  const bars: Record<string, StatusBarData[]> = {};
  const incidentById = new Map<number, IncidentDTO>();
  for (const inc of p.incidents) incidentById.set(inc.id, inc);

  for (const name of Object.keys(p.bars)) {
    const cb = p.bars[name];
    const out: StatusBarData[] = new Array(cb.buckets.length);
    for (let i = 0; i < cb.buckets.length; i++) {
      const b = cb.buckets[i];
      const ts = (p.bucket_start + i * p.bucket_sec) * 1000;
      const eventIds = cb.events?.[String(i)];
      let events: StatusBarData["events"] = [];
      if (eventIds && eventIds.length > 0) {
        events = eventIds.flatMap((id) => {
          const inc = incidentById.get(id);
          if (!inc) return [];
          return [
            {
              id: inc.id,
              name: inc.name,
              type: inc.type,
              from: new Date(inc.from),
              to: inc.to ? new Date(inc.to) : null,
            },
          ];
        });
      }
      out[i] = {
        day: new Date(ts).toISOString(),
        bar: buildBar(b),
        card: buildCard(b),
        events,
      };
    }
    bars[name] = out;
  }

  return { components: p.components, incidents: p.incidents, bars };
}
