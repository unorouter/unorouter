"use client";

import { createContext, useContext, useEffect } from "react";
import type {
  StatusReportUpdateType,
  StatusType,
  ThemeValue,
} from "@/components/ui/status/status.types";

export type StatusBlocksLabels = {
  systemStatus: Record<StatusType, { long: string; short: string }>;
  incidentStatus: Record<StatusReportUpdateType, string>;
  requestStatus: Record<StatusType, string>;

  today: string;
  ongoing: string;
  reportResolved: string;
  noRecentNotifications: string;
  noRecentNotificationsDescription: string;
  noReports: string;
  noReportsDescription: string;
  noPublicMonitors: string;
  noPublicMonitorsDescription: string;

  themeNames: Record<ThemeValue, string>;
  ariaToggleTheme: string;

  subscribe: string;
  subscribeRssDescription: string;
  subscribeAtomDescription: string;
  subscribeJsonDescription: string;
  subscribeSlackDescription: string;
  subscribeSshDescription: string;
  linkCopiedToClipboard: string;
  ariaCopyLink: string;

  poweredBy: string;
  getInTouch: string;

  ariaStatusTracker: string;
  ariaDayStatus: (n: number) => string;
  clickAgainToUnpin: string;

  timestampRelative: string;

  durationIn: (s: string) => string;
  durationEarlier: (s: string) => string;
  durationFor: (s: string) => string;
  durationAcross: (s: string) => string;

  formatDate: (d: Date) => string;
  formatDateShort: (d: Date) => string;
  formatDateTime: (d: Date) => string;
  formatDateRange: (from?: Date, to?: Date) => string;
  formatDateRangeParts: (from: Date, to: Date) => { from: string; to: string };
};

const StatusBlocksLabelsContext = createContext<StatusBlocksLabels | null>(
  null,
);

// Base UI's PreviewCard/HoverCard portal renders its popup in a detached React
// root that does NOT inherit this context, so the hover-card content (which also
// reads the labels) saw a null context and threw, white-screening the whole
// model page. The provider always mounts before the portal can open, so the last
// value it published is a valid, current-locale labels object; fall back to it
// for portaled consumers instead of crashing.
const fallback: { labels: StatusBlocksLabels | null } = { labels: null };

export function StatusBlocksI18nProvider({
  value,
  children,
}: {
  value: StatusBlocksLabels;
  children: React.ReactNode;
}) {
  useEffect(() => {
    fallback.labels = value;
  }, [value]);
  return (
    <StatusBlocksLabelsContext.Provider value={value}>
      {children}
    </StatusBlocksLabelsContext.Provider>
  );
}

export function useStatusBlocksLabels(): StatusBlocksLabels {
  const value = useContext(StatusBlocksLabelsContext);
  if (value) return value;
  if (fallback.labels) return fallback.labels;
  throw new Error(
    "useStatusBlocksLabels: no StatusBlocksI18nProvider mounted. Wrap the consumer in <StatusBlocksI18n> (or a custom provider).",
  );
}
