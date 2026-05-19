import {
  cancelSessionBody,
  completeSessionBody,
  createSessionBody,
  updateSessionBody,
} from "@/lib/api/typebox/checkout-sessions";
import { Elysia } from "elysia";
import { deriveUpstream, getUserId } from "@/server/constants";
import {
  cancelSession,
  completeSession,
  createSession,
  getSession,
  updateSession,
} from "./checkout-sessions.service";
import { acpError } from "./errors";
import { readIdempotencyKey, withIdempotency } from "./idempotency";

const SUPPORTED_VERSIONS = ["2026-01-16"] as const;

function assertApiVersion(request: Request) {
  const version = request.headers.get("api-version");
  if (!version) {
    acpError(400, {
      type: "invalid_request",
      code: "missing_api_version",
      message: "API-Version header is required",
      supported_versions: SUPPORTED_VERSIONS,
    });
  }
  if (
    !SUPPORTED_VERSIONS.includes(version as (typeof SUPPORTED_VERSIONS)[number])
  ) {
    acpError(400, {
      type: "invalid_request",
      code: "unsupported_api_version",
      message: `API-Version ${version} is not supported`,
      supported_versions: SUPPORTED_VERSIONS,
    });
  }
}

export const checkoutSessionsRoute = new Elysia({
  prefix: "/checkout_sessions",
})
  .derive(deriveUpstream)
  .post(
    "/",
    async ({ body, request, set, cookie, upstream }) => {
      assertApiVersion(request);
      const userId = getUserId(cookie);
      const key = readIdempotencyKey(request);
      return withIdempotency(
        { userId, path: "POST /checkout_sessions", key, body, set, cookie },
        async () => {
          const result = await createSession({
            userId,
            items: body.items,
            body,
            upstreamHeaders: upstream.headers,
          });
          return { status: 201, body: result };
        },
      );
    },
    { body: createSessionBody },
  )
  .get("/:id", async ({ params, cookie, upstream }) => {
    const userId = getUserId(cookie);
    return getSession(userId, params.id, upstream.headers);
  })
  .post(
    "/:id",
    async ({ body, params, request, set, cookie, upstream }) => {
      assertApiVersion(request);
      const userId = getUserId(cookie);
      const key = readIdempotencyKey(request);
      return withIdempotency(
        {
          userId,
          path: `POST /checkout_sessions/${params.id}`,
          key,
          body,
          set,
          cookie,
        },
        async () => {
          const result = await updateSession({
            userId,
            sessionId: params.id,
            body,
            items: body.items,
            upstreamHeaders: upstream.headers,
          });
          return { status: 200, body: result };
        },
      );
    },
    { body: updateSessionBody },
  )
  .post(
    "/:id/complete",
    async ({ body, params, request, set, cookie, upstream }) => {
      assertApiVersion(request);
      const userId = getUserId(cookie);
      const key = readIdempotencyKey(request);
      return withIdempotency(
        {
          userId,
          path: `POST /checkout_sessions/${params.id}/complete`,
          key,
          body,
          set,
          cookie,
        },
        async () => {
          const result = await completeSession({
            userId,
            sessionId: params.id,
            upstreamHeaders: upstream.headers,
          });
          return { status: 200, body: result };
        },
      );
    },
    { body: completeSessionBody },
  )
  .post(
    "/:id/cancel",
    async ({ body, params, request, set, cookie }) => {
      assertApiVersion(request);
      const userId = getUserId(cookie);
      const key = readIdempotencyKey(request);
      return withIdempotency(
        {
          userId,
          path: `POST /checkout_sessions/${params.id}/cancel`,
          key,
          body,
          set,
          cookie,
        },
        async () => {
          const result = await cancelSession(userId, params.id);
          return { status: 200, body: result };
        },
      );
    },
    { body: cancelSessionBody },
  );
