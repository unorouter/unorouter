    // ACP error helper. Elysia reads err.status/err.data and emits a spec sec3.1 flat error. never return narrows control flow on throw.
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
