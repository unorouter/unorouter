const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.unorouter.ai";

async function handler(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const targetPath = "/" + path.join("/");
  const url = new URL(request.url);
  const targetUrl = `${API_URL}${targetPath}${url.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("accept-encoding");

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
    redirect: "manual",
    // @ts-expect-error duplex is needed for streaming request bodies
    duplex: "half",
  });

  const body = await response.arrayBuffer();
  const responseHeaders = new Headers();

  // Copy safe headers
  response.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === "content-encoding" || lower === "transfer-encoding" || lower === "content-length") return;
    if (lower === "set-cookie") return;
    responseHeaders.append(key, value);
  });

  // Rewrite Set-Cookie to work on the current origin (strips Domain and Secure for localhost)
  const cookies = response.headers.getSetCookie?.() ?? [];
  for (const cookie of cookies) {
    const rewritten = cookie
      .replace(/;\s*Domain=[^;]*/gi, "")
      .replace(/;\s*Secure/gi, "")
      .replace(/;\s*SameSite=\w+/gi, "; SameSite=Lax");
    responseHeaders.append("set-cookie", rewritten);
  }

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = handler;
