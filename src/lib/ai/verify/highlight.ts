import {
  CJK_CHAR,
  CODING_TOOL_NAMES,
  CODING_TOOL_REFUSAL_PATTERNS,
  SCAM_PAGE_PATTERNS,
} from "./patterns";
import { PROVIDER_CONFIGS } from "./providers/config";
import type { ProbeLabel, VerifyProvider } from "./types";

export type HighlightKind =
  "foreign" | "cjk" | "coding-tool" | "scam" | "home" | null;

export type HighlightSegment = { text: string; kind: HighlightKind };

type Match = { start: number; end: number; kind: HighlightKind };

function collectPhrase(lower: string, phrases: string[], kind: HighlightKind) {
  const out: Match[] = [];
  for (const phrase of phrases) {
    if (!phrase) continue;
    const needle = phrase.toLowerCase();
    let from = 0;
    for (;;) {
      const idx = lower.indexOf(needle, from);
      if (idx === -1) break;
      out.push({ start: idx, end: idx + needle.length, kind });
      from = idx + needle.length;
    }
  }
  return out;
}

export function highlightSpans(
  text: string,
  providerKind: VerifyProvider,
  probeLabel: ProbeLabel,
): HighlightSegment[] {
  if (!text) return [];
  const cfg = PROVIDER_CONFIGS[providerKind];
  if (!cfg) return [{ text, kind: null }];

  const lower = text.toLowerCase();
  const matches: Match[] = [
    ...collectPhrase(lower, CODING_TOOL_NAMES, "coding-tool"),
    ...collectPhrase(lower, CODING_TOOL_REFUSAL_PATTERNS, "coding-tool"),
    ...collectPhrase(lower, SCAM_PAGE_PATTERNS, "scam"),
    ...collectPhrase(lower, cfg.foreignIdentityPatterns, "foreign"),
    ...collectPhrase(lower, cfg.homeIdentityPatterns, "home"),
    ...collectPhrase(lower, cfg.homeModelNamePatterns, "home"),
  ];

  if (probeLabel === "model-name")
    matches.push(
      ...collectPhrase(lower, cfg.cloudModelNamePatterns, "foreign"),
    );

  for (const m of text.matchAll(CJK_CHAR))
    if (m.index !== undefined)
      matches.push({ start: m.index, end: m.index + m[0].length, kind: "cjk" });

  if (matches.length === 0) return [{ text, kind: null }];

  matches.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: Match[] = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start < cursor) continue;
    merged.push(m);
    cursor = m.end;
  }

  const segments: HighlightSegment[] = [];
  let pos = 0;
  for (const m of merged) {
    if (m.start > pos)
      segments.push({ text: text.slice(pos, m.start), kind: null });
    segments.push({ text: text.slice(m.start, m.end), kind: m.kind });
    pos = m.end;
  }
  if (pos < text.length) segments.push({ text: text.slice(pos), kind: null });
  return segments;
}
