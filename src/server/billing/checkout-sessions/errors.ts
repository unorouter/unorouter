// ACP error helper. Elysia reads err.status/err.data, emits spec sec3.1 flat error.
// `never` return enables control-flow narrowing on `throw acpError(...)`.
type AcpErrorBody = {
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
