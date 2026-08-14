import { env } from "@/lib/config/env";

const ORG = (env.githubUrl ?? "https://github.com/unorouter").replace(
  /\/+$/,
  "",
);
const REPO = `${ORG}/unorouter`;
const VERIFY_DIR = `${REPO}/tree/main/src/lib/ai/verify`;

export const TESTER_LINKS = {
  discord: env.discordUrl ?? "https://discord.gg/eRAeFd9aqy",
  source: VERIFY_DIR,
  issuesNew: `${REPO}/issues/new`,
} as const;

export function githubReportUrl(host: string, model: string): string {
  const title = `Model tester dispute: ${host} / ${model}`;
  const body = `Endpoint: ${host}\nRequested model: ${model}\n\nWhy this result is wrong:\n`;
  return `${TESTER_LINKS.issuesNew}?title=${encodeURIComponent(
    title,
  )}&body=${encodeURIComponent(body)}`;
}
