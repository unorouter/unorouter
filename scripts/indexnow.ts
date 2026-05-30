#!/usr/bin/env bun
import { error, log } from "console";
import { IndexNowSubmitter } from "indexnow-submitter";

const INDEXNOW_KEY = process.env.INDEXNOW_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_URL;
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;

if (!INDEXNOW_KEY) {
  error("[IndexNow] Missing INDEXNOW_KEY env var");
  process.exit(1);
}

async function submitToIndexNow() {
  const indexNow = new IndexNowSubmitter({
    key: INDEXNOW_KEY!,
    host: new URL(SITE_URL).host,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    batchSize: 10000,
  });

  log(`[IndexNow] Fetching sitemap from ${SITEMAP_URL}`);
  await indexNow.submitFromSitemap(SITEMAP_URL);

  const analytics = indexNow.getAnalytics();
  log(`[IndexNow] Total: ${analytics.totalSubmissions}`);
  log(`[IndexNow] Successful: ${analytics.successfulSubmissions}`);
  log(`[IndexNow] Failed: ${analytics.failedSubmissions}`);
  log(`[IndexNow] Avg response time: ${analytics.averageResponseTime}ms`);

  return analytics;
}

submitToIndexNow()
  .then((analytics) => {
    process.exit(analytics.failedSubmissions > 0 ? 1 : 0);
  })
  .catch((err) => {
    error("[IndexNow] Fatal error:", err);
    process.exit(1);
  });
