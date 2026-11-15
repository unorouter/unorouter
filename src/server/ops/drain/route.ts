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
    // The compiled server's SIGTERM handler runs Bun's graceful stop: it closes
    // idle keep-alive connections at once, so the tunnel reconnects to pods of
    // the new build instead of fetching new chunks from this one (404) for the
    // whole drain, while open replies and this request still finish.
    if (process.env.NODE_ENV === "production")
      process.kill(process.pid, "SIGTERM");
    return { success: true, data: { cut: await drainStreams(DRAIN_MAX_MS) } };
  },
);
