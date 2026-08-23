import {
  getApiJobsById,
  postApiJobs,
  type GetApiJobsById200,
  type PostApiJobs200,
} from "@/lib/api/uno-import";
import { msg } from "@/lib/config/constants";

// Every source is fetched by uno-import, not here. Some answer this cluster's
// IP with a Cloudflare challenge that only a real browser clears, and none of
// them send a CORS header, so neither the gateway nor the browser can reach
// them directly. The client is generated from that service's own OpenAPI
// document, so the result union stays in step with its adapters; auth and the
// cluster-internal base URL come from the unoImportFetch mutator.

// uno-import owns the source list, so its rejection is the one the user sees.
function importError(data: unknown): Error {
  const error =
    typeof data === "object" && data !== null && "error" in data
      ? (data as { error?: unknown }).error
      : undefined;
  return new Error(
    error === "unsupported source"
      ? msg("ERRORS.CARD_IMPORT_UNSUPPORTED")
      : msg("ERRORS.CARD_IMPORT_FETCH_FAILED"),
  );
}

export async function submitImport(
  input: string,
  userId: string,
): Promise<PostApiJobs200> {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error(msg("ERRORS.CARD_IMPORT_INVALID_URL"));
  }
  if (url.protocol !== "https:") {
    throw new Error(msg("ERRORS.CARD_IMPORT_INVALID_URL"));
  }

  const res = await postApiJobs({ url: url.href, userId });
  if (res.status !== 200) throw importError(res.data);
  return res.data;
}

export async function getImportStatus(
  jobId: string,
): Promise<GetApiJobsById200> {
  const res = await getApiJobsById(encodeURIComponent(jobId));
  if (res.status !== 200) throw importError(res.data);
  return res.data;
}
