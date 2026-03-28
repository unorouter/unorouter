import { jotaiCookieStorage } from "@/lib/config/table-storage";
import { atomWithStorage } from "jotai/utils";

export const API_KEY_COOKIE = "api-key";

export const apiKeyAtom = atomWithStorage<string | null>(
  API_KEY_COOKIE,
  null,
  jotaiCookieStorage,
);
