export type StatusType = "success" | "degraded" | "error" | "info" | "empty";
export type StatusEventType = "incident" | "report" | "maintenance";
export type StatusReportUpdateType =
  "investigating" | "identified" | "monitoring" | "resolved";

export type ThemeValue = "light" | "dark" | "system";

export interface Maintenance {
  id: number;
  title: string;
  affected: string[];
  message: string;
  from: Date;
  to: Date;
}

export type StatusBarData = {
  day: string;
  bar: {
    status: StatusType;
    // NOTE: is in percentage! should sum up to 100%
    height: number;
  }[];
  card: {
    status: StatusType;
    value: string;
  }[];
  events: {
    id: number;
    name: string;
    type: StatusEventType;
    from: Date | null;
    to: Date | null;
    isAggregated?: boolean;
  }[];
};
