export const ADMIN_HEADERS = {
  Authorization: process.env.SYSTEM_ACCESS_TOKEN,
  "New-Api-User": "1",
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
