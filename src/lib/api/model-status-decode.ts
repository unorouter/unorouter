import type {
  StatusBarData,
  StatusEventType,
  StatusType,
} from "@/components/ui/status/status.types";
import type {
  CompactPageDTO,
  ComponentDTO,
  EventDTO,
  StatusBarDataDTO,
} from "@/openapi";
import { dayjs } from "@/lib/utils/format/date";
import { formatLatency } from "@/lib/utils/format/number";

type CompactBucket = [
  number, // ok
  number, // degraded
  number, // err
  number, // empty
  number, // reqSum
  number, // errSum
  number, // p95
];

type IncidentDTO = Omit<EventDTO, "type"> & { type: StatusEventType };

// Upstream types a bucket as unknown[]; it is a fixed 7-number tuple.
function toBucket(v: unknown): CompactBucket | null {
  if (!Array.isArray(v) || v.length < 7) return null;
  const n = v.slice(0, 7).map((x) => (typeof x === "number" ? x : 0));
  return [n[0], n[1], n[2], n[3], n[4], n[5], n[6]];
}

type DecodedStatusPage = {
  components: ComponentDTO[];
  incidents: IncidentDTO[];
  bars: Record<string, StatusBarData[]>;
};

const BAR_STATUSES = ["success", "degraded", "error", "empty"] as const;

function buildBar(b: CompactBucket): StatusBarData["bar"] {
  const count = b[0] + b[1] + b[2] + b[3];
  if (count === 0) return [{ status: "empty", height: 100 }];
  const segs = BAR_STATUSES.map((status, i) => ({
    status,
    height: Math.floor((b[i] * 100) / count),
  })).filter((seg) => seg.height > 0);
  const sum = segs.reduce((acc, seg) => acc + seg.height, 0);
  if (segs.length > 0) segs[segs.length - 1].height += 100 - sum;
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
  if (ok > 0) items.push({ status: "success", value: `${ok} min` });
  if (deg > 0) items.push({ status: "degraded", value: `${deg} min` });
  if (err > 0) items.push({ status: "error", value: `${err} min` });
  if (reqSum > 0 || errSum > 0) {
    const latency = p95 > 0 ? ` / p95 ${formatLatency(p95, 1)}` : "";
    items.push({
      status: "success",
      value: `${reqSum} req / ${errSum} err${latency}`,
    });
  }
  return items;
}

export function decodeCompactPage(p: CompactPageDTO): DecodedStatusPage {
  const bars: Record<string, StatusBarData[]> = {};
  const incidentById = new Map<number, IncidentDTO>();
  // Upstream deploy skew can serve a payload without these fields; a bare
  // `for...of undefined` took the whole status page SSR down in every locale.
  const incidents = (p.incidents ?? []).map((e): IncidentDTO => ({
    ...e,
    type: toEventType(e.type),
  }));
  for (const inc of incidents) incidentById.set(inc.id, inc);

  const rawBars = p.bars ?? {};
  for (const name of Object.keys(rawBars)) {
    const cb = rawBars[name];
    const buckets = (cb.buckets ?? []).flatMap((v) => {
      const b = toBucket(v);
      return b ? [b] : [];
    });
    const out: StatusBarData[] = new Array(buckets.length);
    for (let i = 0; i < buckets.length; i++) {
      const b = buckets[i];
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
              from: dayjs(inc.from).toDate(),
              to: inc.to ? dayjs(inc.to).toDate() : null,
            },
          ];
        });
      }
      out[i] = {
        day: dayjs(ts).toISOString(),
        bar: buildBar(b),
        card: buildCard(b),
        events,
      };
    }
    bars[name] = out;
  }

  return { components: p.components ?? [], incidents, bars };
}

const STATUS_TYPES: readonly StatusType[] = [
  "success",
  "degraded",
  "error",
  "info",
  "empty",
];
const EVENT_TYPES: readonly StatusEventType[] = [
  "incident",
  "report",
  "maintenance",
];

// The DTO types these as bare strings; unknown values must not reach a
// component that switches on them.
function toStatus(s: string): StatusType {
  return STATUS_TYPES.find((v) => v === s) ?? "empty";
}

function toEventType(s: string): StatusEventType {
  return EVENT_TYPES.find((v) => v === s) ?? "incident";
}

export function decodeBucketDtos(
  dtos: StatusBarDataDTO[] | null | undefined,
): StatusBarData[] {
  if (!dtos) return [];
  return dtos.map((d) => ({
    day: d.day,
    bar: (d.bar ?? []).map((seg) => ({
      status: toStatus(seg.status),
      height: seg.height,
    })),
    card: (d.card ?? []).map((c) => ({
      status: toStatus(c.status),
      value: c.value,
    })),
    events: (d.events ?? []).map((e) => ({
      id: e.id,
      name: e.name,
      type: toEventType(e.type),
      from: dayjs(e.from).toDate(),
      to: e.to ? dayjs(e.to).toDate() : null,
      isAggregated: e.is_aggregated,
    })),
  }));
}
