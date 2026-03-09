"use client";

import { TranslationKey } from "@/lib/config/constants";
import { useAuthQuery } from "../auth-hook";

const ROLE_LABELS: Record<number, TranslationKey> = {
  100: "AUTH.ROLE_ROOT",
  10: "AUTH.ROLE_ADMIN",
  1: "AUTH.ROLE_USER",
  0: "AUTH.ROLE_GUEST",
};

export function useUserDisplay() {
  const { data: user, isLoading } = useAuthQuery();

  if (!user) {
    return {
      user: null,
      isLoading,
      displayName: "",
      initials: "",
      roleKey: undefined as TranslationKey | undefined,
      balanceDisplay: null as string | null,
    };
  }

  const displayName = user.display_name || user.username || "";
  const initials = displayName.charAt(0).toUpperCase();
  const roleKey = ROLE_LABELS[user.role];
  const balanceDisplay =
    user.quota !== undefined ? `$${(user.quota / 500000).toFixed(2)}` : null;

  return { user, isLoading, displayName, initials, roleKey, balanceDisplay };
}
