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

const STATUS_EVENT_TYPES: StatusEventType[] = [
  "incident",
  "report",
  "maintenance",
];

// Upstream types EventDTO.type as a plain string, so narrow it here rather than
// asserting the whole payload at the route.
function toIncident(e: EventDTO): IncidentDTO {
  const type = STATUS_EVENT_TYPES.find((t) => t === e.type) ?? "incident";
  return { ...e, type };
}

// the refinement this module exists to decode.
export type CompactPagePayload = CompactPageDTO;

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

const STATUS_SUCCESS: StatusType = "success";
const STATUS_DEGRADED: StatusType = "degraded";
const STATUS_ERROR: StatusType = "error";
const STATUS_EMPTY: StatusType = "empty";

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
    const latency = p95 > 0 ? ` / p95 ${formatLatency(p95, 1)}` : "";
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
  // Upstream deploy skew can serve a payload without these fields; a bare
  // `for...of undefined` took the whole status page SSR down in every locale.
  const incidents = (p.incidents ?? []).map(toIncident);
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
  STATUS_SUCCESS,
  STATUS_DEGRADED,
  STATUS_ERROR,
  "info",
  STATUS_EMPTY,
];
const EVENT_TYPES: readonly StatusEventType[] = [
  "incident",
  "report",
  "maintenance",
];

// The DTO types these as bare strings; unknown values must not reach a
// component that switches on them.
function toStatus(s: string): StatusType {
  return STATUS_TYPES.find((v) => v === s) ?? STATUS_EMPTY;
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
