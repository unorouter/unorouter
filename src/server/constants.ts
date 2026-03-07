import { NEW_API_USER, USER_ID_COOKIE } from "@/lib/config/constants";
import { parseCookie } from "cookie";

export const ADMIN_HEADERS = {
  Authorization: process.env.SYSTEM_ACCESS_TOKEN,
  [NEW_API_USER]: "1",
};

export async function getServerCookieHeader(): Promise<string> {
  if (typeof window !== "undefined") return "";
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    return cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
  } catch {
    return "";
  }
}

export function deriveUpstream({ request }: { request: Request }) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const headers: Record<string, string> = {};
  if (cookieHeader) {
    headers.cookie = cookieHeader;
    const userId = parseCookie(cookieHeader)[USER_ID_COOKIE];
    if (userId) headers[NEW_API_USER] = userId;
  }
  return { upstream: { headers } };
}
