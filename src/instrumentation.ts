import type { Instrumentation } from "next";

export async function register() {
  await import("./lib/utils/format/date");
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { recordServerError } = await import("./server/ops/server-error");
  await recordServerError(error, {
    source: `next.${context.routeType}`,
    route: context.routePath,
    path: request.path,
    method: request.method,
  });
};
