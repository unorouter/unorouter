// ACP error helper. The Elysia boundary at app/api/[[...route]]/route.ts
// reads `err.status` and `err.data` directly, so throwing a plain object with
// those keys produces the spec's flat error response (§3.1) at the configured
// HTTP status. Type is widened to `never` so `throw acpError(...)` works as a
// statement that narrows control flow.
export type AcpErrorBody = {
  type: "invalid_request" | "processing_error" | "service_unavailable";
  code: string;
  message: string;
  param?: string;
  // Allow extra fields like supported_versions on version errors.
  [key: string]: unknown;
};

export function acpError(status: number, data: AcpErrorBody): never {
  const err = Object.assign(new Error(data.message), { status, data });
  throw err;
}
