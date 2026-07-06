type AcpErrorBody = {
  type: "invalid_request" | "processing_error" | "service_unavailable";
  code: string;
  message: string;
  param?: string;
  [key: string]: unknown;
};

export function acpError(status: number, data: AcpErrorBody): never {
  const err = Object.assign(new Error(data.message), { status, data });
  throw err;
}
