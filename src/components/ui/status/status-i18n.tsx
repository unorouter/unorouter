"use client";

import { createContext, useContext } from "react";
import type {
  StatusReportUpdateType,
  StatusType,
  ThemeValue,
} from "@/components/ui/status/status.types";

// Required ancestor; hook throws (no fallback so untranslated copy can't slip in).
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
  // Closed-range halves as separate strings (no re-parsing formatDateRange). Both from/to required.
  formatDateRangeParts: (from: Date, to: Date) => { from: string; to: string };
};

const StatusBlocksLabelsContext = createContext<StatusBlocksLabels | null>(
  null,
);

export function StatusBlocksI18nProvider({
  value,
  children,
}: {
  value: StatusBlocksLabels;
  children: React.ReactNode;
}) {
  return (
    <StatusBlocksLabelsContext.Provider value={value}>
      {children}
    </StatusBlocksLabelsContext.Provider>
  );
}

export function useStatusBlocksLabels(): StatusBlocksLabels {
  const value = useContext(StatusBlocksLabelsContext);
  if (!value) {
    throw new Error(
      "useStatusBlocksLabels: no StatusBlocksI18nProvider mounted. Wrap the consumer in <StatusBlocksI18n> (or a custom provider).",
    );
  }
  return value;
}
