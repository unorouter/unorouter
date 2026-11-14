import { fishTtsBody, fishVoiceSearchQuery } from "@/lib/validation/voice";
import { rateLimit } from "@/server/rate-limit";
import { Elysia } from "elysia";
import { fishTts, searchFishVoices } from "./fish.service";

const ttsLimit = rateLimit(60);

// Open to guests like custom-forward: the caller's own Fish key is required,
// and the target host is fixed, so this relays to Fish and nowhere else.
export const voiceRoute = new Elysia({ prefix: "/voice" })
  .post(
    "/fish/tts",
    ({ request, body }) =>
      fishTts(request.headers.get("authorization"), body, request.signal),
    { body: fishTtsBody, beforeHandle: ttsLimit },
  )
  .get(
    "/fish/voices",
    ({ request, query }) =>
      searchFishVoices(
        request.headers.get("authorization"),
        query.q,
        request.signal,
      ),
    { query: fishVoiceSearchQuery, beforeHandle: ttsLimit },
  );
