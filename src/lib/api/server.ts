import { handleElysia } from "@/lib/utils";
import { rpc } from "@/lib/rpc";
import { AuthUser } from "@/store/auth-store";

export async function fetchSelfServer(): Promise<AuthUser | null> {
  try {
    const result = handleElysia(await rpc.api.auth.self.get());
    if (!result?.success) return null;
    return result?.data ?? null;
  } catch {
    return null;
  }
}
