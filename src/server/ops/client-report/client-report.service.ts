import { logger } from "@/lib/utils/logger";
import { scrubStack, scrubText } from "@/lib/utils/scrub";
import { TraceMap, originalPositionFor } from "@jridgewell/trace-mapping";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type ClientReport = {
  source: string;
  name: string;
  message: string;
  stack: string;
  componentStack?: string;
  path: string;
  release: string;
};

export type Frame = {
  fn: string;
  file: string;
  line: number;
  col: number;
  resolved: boolean;
};

// Maps are copied here at image build and never served (next.config, Dockerfile).
const MAP_DIR = process.env.SOURCEMAP_DIR ?? join(process.cwd(), "sourcemaps");
const RELEASE = process.env.NEXT_DEPLOYMENT_ID ?? "";
const maps = new Map<string, Promise<TraceMap | null>>();

function loadMap(rel: string): Promise<TraceMap | null> {
  let p = maps.get(rel);
  if (!p) {
    p = readFile(join(MAP_DIR, `${rel}.map`), "utf8")
      .then((raw) => new TraceMap(raw))
      .catch(() => null);
    if (maps.size > 200) maps.clear();
    maps.set(rel, p);
  }
  return p;
}

const CHROME = /^\s*at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/;
const GECKO = /^\s*(.*?)@(.+?):(\d+):(\d+)$/;

async function toFrame(line: string): Promise<Frame | null> {
  const m = CHROME.exec(line) ?? GECKO.exec(line);
  if (!m) return null;
  const [, fn = "", url, l, c] = m;
  const frame = {
    fn: fn || "?",
    file: url,
    line: +l,
    col: +c,
    resolved: false,
  };
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return frame;
  }
  frame.file = parsed.pathname;
  const dpl = parsed.searchParams.get("dpl");
  if (!parsed.pathname.startsWith("/_next/static/")) return frame;
  if (dpl && dpl !== RELEASE) return frame;
  const map = await loadMap(parsed.pathname.slice("/_next/static/".length));
  if (!map) return frame;
  const pos = originalPositionFor(map, {
    line: frame.line,
    column: frame.col - 1,
  });
  if (!pos.source || pos.line == null) return frame;
  return {
    fn: pos.name ?? frame.fn,
    file: pos.source
      .replace(/^.*?\[project\]\//, "")
      .replace(/^webpack:\/\/\//, ""),
    line: pos.line,
    col: (pos.column ?? 0) + 1,
    resolved: true,
  };
}

function normalise(message: string): string {
  return message
    .replace(/(["'`]).*?\1/g, "'*'")
    .replace(/\b[0-9a-f]{8,}\b/gi, "*")
    .replace(/<n>|\d+/g, "#")
    .slice(0, 200);
}

export async function parseFrames(stack: string): Promise<Frame[]> {
  const lines = scrubStack(stack).split("\n").slice(0, 40);
  const frames = await Promise.all(lines.map(toFrame));
  return frames.filter((f): f is Frame => f !== null);
}

// Same idea as PostHog's: our own resolved frames identify the bug, the
// message only when nothing resolved, so one bug is one fingerprint.
export function fingerprint(
  name: string,
  message: string,
  frames: Frame[],
  scope = "",
): string {
  const own = frames.filter(
    (f) => f.resolved && !f.file.includes("node_modules"),
  );
  const key = own.length
    ? own
        .slice(0, 5)
        .map((f) => `${f.file}:${f.fn}`)
        .join("|")
    : normalise(message);
  return createHash("sha1")
    .update(`${scope}|${name}|${key}`)
    .digest("hex")
    .slice(0, 12);
}

function browserOf(ua: string): string {
  const named =
    /(Edg|OPR|Firefox|SamsungBrowser)\/(\d+)/.exec(ua) ??
    /(Chrome)\/(\d+)/.exec(ua);
  if (named) return `${named[1]} ${named[2]}`;
  const safari = /Version\/(\d+).*Safari/.exec(ua);
  return safari ? `Safari ${safari[1]}` : "other";
}

export async function recordClientReport(
  report: ClientReport,
  userAgent: string,
): Promise<void> {
  const frames = await parseFrames(report.stack);
  const message = scrubText(report.message);
  logger.error(`${report.name}: ${message}`, {
    context: "client.error",
    fingerprint: fingerprint(report.name, message, frames),
    source: report.source,
    path: report.path.split(/[?#]/)[0],
    release: report.release,
    current: report.release === RELEASE,
    browser: browserOf(userAgent),
    frames: frames
      .slice(0, 10)
      .map(
        (f) =>
          `${f.fn} ${f.file}:${f.line}:${f.col}${f.resolved ? "" : " (min)"}`,
      ),
    componentStack: report.componentStack
      ? scrubStack(report.componentStack)
          .split("\n")
          .filter(Boolean)
          .slice(0, 6)
      : undefined,
  });
}
