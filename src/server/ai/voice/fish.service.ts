import { safeFetchStream } from "@/lib/config/safe-fetch";
import { msg } from "@/lib/config/constants";
import type { FishTtsBody } from "@/lib/validation/voice";

// Fish Audio answers no CORS preflight, so the browser cannot call it. The
// host is fixed and the caller's own key is piped through, never stored.
const FISH = "https://api.fish.audio";

function json(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function pipe(
  url: string,
  init: Parameters<typeof safeFetchStream>[1],
): Promise<Response> {
  let upstream;
  try {
    upstream = await safeFetchStream(url, init);
  } catch (err) {
    return json(502, err instanceof Error ? err.message : "upstream error");
  }
  const type = upstream.headers.get("content-type");
  return new Response(upstream.body, {
    status: upstream.status,
    headers: type ? { "content-type": type } : {},
  });
}

export function fishTts(
  authorization: string | null,
  body: FishTtsBody,
  signal: AbortSignal,
): Promise<Response> | Response {
  if (!authorization) return json(401, msg("ERRORS.NO_API_KEY"));
  const ids = body.referenceIds;
  return pipe(`${FISH}/v1/tts`, {
    method: "POST",
    headers: {
      authorization,
      "content-type": "application/json",
      model: body.model,
    },
    body: JSON.stringify({
      text: body.text,
      format: "mp3",
      ...(ids.length > 0 && { reference_id: ids.length === 1 ? ids[0] : ids }),
      prosody: { speed: body.speed, volume: body.volume },
    }),
    signal,
  });
}

export function searchFishVoices(
  authorization: string | null,
  query: string | undefined,
  signal: AbortSignal,
): Promise<Response> | Response {
  if (!authorization) return json(401, msg("ERRORS.NO_API_KEY"));
  const params = new URLSearchParams({ page_size: "20", sort_by: "score" });
  if (query?.trim()) params.set("title", query.trim());
  return pipe(`${FISH}/model?${params}`, {
    headers: { authorization },
    signal,
  });
}
