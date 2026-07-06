// Shared recharts config for the detail-page trend charts (performance latency
// line + usage-ranking bars). Per-chart differences (cursor, formatter, domain,
// grid orientation) stay inline; only the identical pieces live here.

export const CHART_MARGIN = { top: 5, right: 8, bottom: 0, left: -8 };

export const CHART_AXIS_TICK = { fontSize: 10 };

export const CHART_ACCENT = "var(--color-chart-1)";

export const CHART_TOOLTIP_STYLE = {
  fontSize: 11,
  fontFamily: "monospace",
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--popover-foreground)",
};

export const CHART_TOOLTIP_LABEL_STYLE = { color: "var(--muted-foreground)" };
