"use client";

import { renderQuota, TranslationKey } from "@/lib/config/constants";
import { useAuthQuery } from "../auth-hook";

const ROLE_LABELS: Record<number, TranslationKey> = {
  100: "AUTH.ENUM.ROOT",
  10: "AUTH.ENUM.ADMIN",
  1: "AUTH.ENUM.USER",
  0: "AUTH.ENUM.GUEST",
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
    user.quota !== undefined ? renderQuota(user.quota) : null;

  return { user, isLoading, displayName, initials, roleKey, balanceDisplay };
}
