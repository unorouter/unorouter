import { drainStreams } from "@/server/ai/chat/stream-buffer";
import { Elysia } from "elysia";

// The preStop hook in k8s/deployment.yaml: SIGTERM waits until this returns.
// Under Bun's 255 s idle cap and the pod's 270 s grace period.
const DRAIN_MAX_MS = 240_000;

// Kubelet calls the pod directly; a request through Cloudflare carries
// cf-connecting-ip and is refused.
export const drainRoute = new Elysia({ prefix: "/drain" }).get(
  "/",
  async ({ request, status }) => {
    if (request.headers.has("cf-connecting-ip")) return status(404);
    return { success: true, data: { cut: await drainStreams(DRAIN_MAX_MS) } };
  },
);
