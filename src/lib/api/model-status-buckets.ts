import type {
  StatusBarData,
  StatusEventType,
  StatusType,
} from "@/components/ui/status/status.types";
import type { StatusBarDataDTO } from "@/openapi";
import { dayjs } from "@/lib/utils/format/date";

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

function toStatus(s: string): StatusType {
  return STATUS_TYPES.find((v) => v === s) ?? "empty";
}

function toEventType(s: string): StatusEventType {
  return EVENT_TYPES.find((v) => v === s) ?? "incident";
}

// The per-model buckets endpoint returns the verbose StatusBarDataDTO[] (nullable
// fields, string enums). Coerce it into the StatusBar component's StatusBarData[].
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
