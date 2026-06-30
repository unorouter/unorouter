import { env } from "@/lib/config/env";

// All model-tester external links in ONE place, derived from env so the org URL
// is never hardcoded per component. The web tester (this feature) lives in the
// unorouter repo itself; the detection library is src/lib/ai/verify. Links point
// THERE, not at the separate new-api-sync backend CLI.
const ORG = (env.githubUrl ?? "https://github.com/unorouter").replace(
  /\/+$/,
  "",
);
const REPO = `${ORG}/unorouter`;
const VERIFY_DIR = `${REPO}/tree/main/src/lib/ai/verify`;

export const TESTER_LINKS = {
  discord: env.discordUrl ?? "https://discord.gg/eRAeFd9aqy",
  // The open-source detection library that powers this tester.
  source: VERIFY_DIR,
  issuesNew: `${REPO}/issues/new`,
} as const;

// A prefilled GitHub issue for disputing a published ranking row.
export function githubReportUrl(host: string, model: string): string {
  const title = `Model tester dispute: ${host} / ${model}`;
  const body = `Endpoint: ${host}\nRequested model: ${model}\n\nWhy this result is wrong:\n`;
  return `${TESTER_LINKS.issuesNew}?title=${encodeURIComponent(
    title,
  )}&body=${encodeURIComponent(body)}`;
}
