import { logger } from "@/lib/utils/logger";
import { scrubText } from "@/lib/utils/scrub";
import {
  fingerprint,
  parseFrames,
} from "@/server/ops/client-report/client-report.service";

// Server chunks ship without maps, so frames stay minified and the route plus
// the normalised message carry the fingerprint.
export async function recordServerError(
  error: unknown,
  where: { source: string; route: string; path: string; method: string },
): Promise<void> {
  const err = error instanceof Error ? error : new Error(String(error));
  const message = scrubText(err.message);
  const frames = await parseFrames(err.stack ?? "");
  const digest =
    "digest" in err && typeof err.digest === "string" ? err.digest : undefined;
  logger.error(`${err.name}: ${message}`, {
    context: "server.error",
    fingerprint: fingerprint(err.name, message, frames, where.route),
    source: where.source,
    route: where.route,
    path: scrubText(where.path.split(/[?#]/)[0]),
    method: where.method,
    digest,
    release: process.env.NEXT_DEPLOYMENT_ID ?? "",
    frames: frames
      .slice(0, 10)
      .map(
        (f) =>
          `${f.fn} ${f.file.replace(/^.*?\.next\//, "")}:${f.line}:${f.col}`,
      ),
  });
}
