"use client";

import { StatusBlocksI18nProvider } from "@/components/ui/status/status-i18n";
import type { StatusBlocksLabels } from "@/components/ui/status/status-i18n";
import {
  formatDate,
  formatDateShort,
  formatDateTime,
  formatTime,
} from "@/components/ui/status/status.utils";
import { isEndOfDay, isSameDay, isStartOfDay } from "@/lib/utils/format/date";
import { useLocale, useTranslations } from "next-intl";

// Wraps OpenStatus blocks with localized labels + locale-aware date formatters;
// mounted once so banner / hover card / event copy follows the selected language.
export function StatusBlocksI18n(props: { children: React.ReactNode }) {
  const t = useTranslations();
  const locale = useLocale();

  const value: StatusBlocksLabels = {
    systemStatus: {
      success: {
        long: t("STATUS.BLOCKS.BANNER_SUCCESS"),
        short: t("STATUS.BLOCKS.PILL_SUCCESS"),
      },
      degraded: {
        long: t("STATUS.BLOCKS.BANNER_DEGRADED"),
        short: t("STATUS.BLOCKS.PILL_DEGRADED"),
      },
      error: {
        long: t("STATUS.BLOCKS.BANNER_ERROR"),
        short: t("STATUS.BLOCKS.PILL_ERROR"),
      },
      info: {
        long: t("STATUS.BLOCKS.BANNER_INFO"),
        short: t("STATUS.BLOCKS.PILL_INFO"),
      },
      empty: {
        long: t("STATUS.BLOCKS.BANNER_EMPTY"),
        short: t("STATUS.BLOCKS.PILL_EMPTY"),
      },
    },
    requestStatus: {
      success: t("STATUS.BLOCKS.REQUEST_SUCCESS"),
      degraded: t("STATUS.BLOCKS.REQUEST_DEGRADED"),
      error: t("STATUS.BLOCKS.REQUEST_ERROR"),
      info: t("STATUS.BLOCKS.REQUEST_INFO"),
      empty: t("STATUS.BLOCKS.REQUEST_EMPTY"),
    },
    incidentStatus: {
      resolved: t("STATUS.BLOCKS.INCIDENT_RESOLVED"),
      monitoring: t("STATUS.BLOCKS.INCIDENT_MONITORING"),
      identified: t("STATUS.BLOCKS.INCIDENT_IDENTIFIED"),
      investigating: t("STATUS.BLOCKS.INCIDENT_INVESTIGATING"),
    },

    today: t("STATUS.BLOCKS.TODAY"),
    ongoing: t("STATUS.BLOCKS.ONGOING"),
    reportResolved: t("STATUS.BLOCKS.REPORT_RESOLVED"),

    noRecentNotifications: t("STATUS.BLOCKS.NO_RECENT_NOTIFICATIONS"),
    noRecentNotificationsDescription: t(
      "STATUS.BLOCKS.NO_RECENT_NOTIFICATIONS_DESCRIPTION",
    ),
    noReports: t("STATUS.BLOCKS.NO_REPORTS"),
    noReportsDescription: t("STATUS.BLOCKS.NO_REPORTS_DESCRIPTION"),
    noPublicMonitors: t("STATUS.BLOCKS.NO_PUBLIC_MONITORS"),
    noPublicMonitorsDescription: t(
      "STATUS.BLOCKS.NO_PUBLIC_MONITORS_DESCRIPTION",
    ),
    themeNames: {
      light: t("STATUS.BLOCKS.THEME_LIGHT"),
      dark: t("STATUS.BLOCKS.THEME_DARK"),
      system: t("STATUS.BLOCKS.THEME_SYSTEM"),
    },
    ariaToggleTheme: t("STATUS.BLOCKS.ARIA_TOGGLE_THEME"),
    subscribe: t("STATUS.BLOCKS.SUBSCRIBE"),
    subscribeRssDescription: t("STATUS.BLOCKS.SUBSCRIBE_RSS_DESCRIPTION"),
    subscribeAtomDescription: t("STATUS.BLOCKS.SUBSCRIBE_ATOM_DESCRIPTION"),
    subscribeJsonDescription: t("STATUS.BLOCKS.SUBSCRIBE_JSON_DESCRIPTION"),
    subscribeSlackDescription: t("STATUS.BLOCKS.SUBSCRIBE_SLACK_DESCRIPTION"),
    subscribeSshDescription: t("STATUS.BLOCKS.SUBSCRIBE_SSH_DESCRIPTION"),
    linkCopiedToClipboard: t("STATUS.BLOCKS.LINK_COPIED_TO_CLIPBOARD"),
    ariaCopyLink: t("STATUS.BLOCKS.ARIA_COPY_LINK"),
    poweredBy: t("STATUS.BLOCKS.POWERED_BY"),
    getInTouch: t("STATUS.BLOCKS.GET_IN_TOUCH"),

    ariaStatusTracker: t("STATUS.BLOCKS.ARIA_STATUS_TRACKER"),
    ariaDayStatus: (n) => t("STATUS.BLOCKS.ARIA_DAY_STATUS", { n }),
    clickAgainToUnpin: t("STATUS.BLOCKS.CLICK_AGAIN_TO_UNPIN"),
    timestampRelative: t("STATUS.BLOCKS.TIMESTAMP_RELATIVE"),

    durationIn: (duration) => t("STATUS.BLOCKS.DURATION_IN", { duration }),
    durationEarlier: (duration) =>
      t("STATUS.BLOCKS.DURATION_EARLIER", { duration }),
    durationFor: (duration) => t("STATUS.BLOCKS.DURATION_FOR", { duration }),
    durationAcross: (duration) =>
      t("STATUS.BLOCKS.DURATION_ACROSS", { duration }),

    formatDate: (d) => formatDate(d, undefined, locale),
    formatDateShort: (d) => formatDateShort(d, locale),
    formatDateTime: (d) => formatDateTime(d, locale),
    formatDateRange: (from, to) => {
      if (from && to && isSameDay(from, to)) {
        if (from.getTime() === to.getTime())
          return formatDateTime(from, locale);
        return `${formatDateTime(from, locale)} - ${formatTime(to, locale)}`;
      }
      if (from && to) {
        if (isStartOfDay(from) && isEndOfDay(to)) {
          return `${formatDate(from, undefined, locale)} - ${formatDate(to, undefined, locale)}`;
        }
        return `${formatDateTime(from, locale)} - ${formatDateTime(to, locale)}`;
      }
      if (to)
        return t("STATUS.BLOCKS.DATE_UNTIL", {
          date: formatDateTime(to, locale),
        });
      if (from)
        return t("STATUS.BLOCKS.DATE_SINCE", {
          date: formatDateTime(from, locale),
        });
      return t("STATUS.BLOCKS.DATE_ALL_TIME");
    },
    formatDateRangeParts: (from, to) => {
      if (isSameDay(from, to)) {
        return {
          from: formatDateTime(from, locale),
          to: formatTime(to, locale),
        };
      }
      if (isStartOfDay(from) && isEndOfDay(to)) {
        return {
          from: formatDate(from, undefined, locale),
          to: formatDate(to, undefined, locale),
        };
      }
      return {
        from: formatDateTime(from, locale),
        to: formatDateTime(to, locale),
      };
    },
  };

  return (
    <StatusBlocksI18nProvider value={value}>
      {props.children}
    </StatusBlocksI18nProvider>
  );
}
