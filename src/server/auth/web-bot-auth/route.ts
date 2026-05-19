import { logger } from "@/lib/utils/logger";
import {
  verifyInboundRequest,
  type VerifiedAgent,
} from "@/server/auth/web-bot-auth/verify-inbound";
import { Elysia } from "elysia";

export const webBotAuthPlugin = new Elysia({ name: "web-bot-auth" }).derive(
  async ({ request }) => {
    let verifiedAgent: VerifiedAgent | null = null;
    if (request.headers.get("signature")) {
      try {
        verifiedAgent = await verifyInboundRequest(request);
        if (verifiedAgent) {
          logger.info("Verified agent request", {
            context: "web-bot-auth",
            agent: verifiedAgent.origin,
            keyid: verifiedAgent.keyid,
          });
        }
      } catch (error) {
        logger.warn("Inbound verification threw", {
          context: "web-bot-auth",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return { verifiedAgent };
  },
);
