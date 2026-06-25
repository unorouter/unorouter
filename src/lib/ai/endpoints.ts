// Upstream OpenAI-compatible API endpoint paths (relative to the api base url). Single source so the
// request-log curl, the media dispatcher, and the playground builders agree on the wire path.
export const API_ENDPOINTS = {
  chatCompletions: "/v1/chat/completions",
  imagesGenerations: "/v1/images/generations",
  imagesEdits: "/v1/images/edits",
  audioSpeech: "/v1/audio/speech",
  audioTranscriptions: "/v1/audio/transcriptions",
  embeddings: "/v1/embeddings",
} as const;

export type ApiEndpoint = (typeof API_ENDPOINTS)[keyof typeof API_ENDPOINTS];
