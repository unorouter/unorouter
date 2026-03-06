import {
  getServerCookieHeader,
  forwardUpstreamCookies,
} from "@/server/constants";

export const customFetch = async <T>(
  url: string,
  options: RequestInit,
): Promise<T> => {
  let isJsonBody = false;
  if (typeof options.body === "string") {
    try {
      JSON.parse(options.body);
      isJsonBody = true;
    } catch {}
  }

  const cookieHeader = await getServerCookieHeader();
  const existingHeaders = options.headers as Record<string, string> | undefined;
  const hasCookie = existingHeaders?.cookie || existingHeaders?.Cookie;

  const response = await fetch(
    new URL(url, process.env.NEXT_PUBLIC_API_URL).toString(),
    {
      ...options,
      credentials: "include",
      headers: {
        ...(isJsonBody && { "Content-Type": "application/json" }),
        ...(cookieHeader && !hasCookie && { cookie: cookieHeader }),
        ...options.headers,
      },
    },
  );

  await forwardUpstreamCookies(response.headers);

  if (!response.ok) {
    const text = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    throw { status: response.status, data, headers: response.headers };
  }

  const contentType = response.headers.get("content-type");

  let data: T;
  if (contentType?.includes("application/json")) {
    data = await response.json();
  } else if (
    contentType &&
    !contentType.startsWith("text/") &&
    !contentType.includes("json") &&
    !contentType.includes("xml")
  ) {
    data = (await response.blob()) as T;
  } else {
    data = (await response.text()) as T;
  }

  return { status: response.status, data, headers: response.headers } as T;
};
