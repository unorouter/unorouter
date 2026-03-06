import { handleElysia } from "@/lib/utils";
import { rpc } from "@/lib/rpc";
import { AuthUser } from "@/store/auth-store";
import { cookies } from "next/headers";

export async function fetchSelfServer(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  if (!cookieHeader) return null;

  try {
    const result = handleElysia(
      await rpc.api.auth.self.get({
        headers: { cookie: cookieHeader },
      }),
    );
    if (!result?.success) return null;
    return result?.data ?? null;
  } catch {
    return null;
  }
}
