import raw from "../../../public/seo-timestamps.json" with { type: "json" };

export type SeoTimestamp = {
  published: string;
  modified: string;
};

const data = raw as Record<string, SeoTimestamp>;

export function getSeoTimestamps(slug: string): SeoTimestamp | undefined {
  return data[slug];
}
