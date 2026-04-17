import type { SeoTimestampSlug } from "@/i18n/registry";
import raw from "../../../public/seo-timestamps.json" with { type: "json" };

export type SeoTimestamp = {
  published: string;
  modified: string;
};

const data = raw as Record<string, SeoTimestamp>;

export function getSeoTimestamps(
  slug: SeoTimestampSlug,
): SeoTimestamp | undefined {
  return data[slug];
}
