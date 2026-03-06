"use client";

import { useAuthQuery } from "@/hooks/auth-hook";
import { isLoadingAuthAtom, userAtom, userIdAtom } from "@/store/auth-store";
import { useSetAtom } from "jotai";
import { ReactNode, useEffect } from "react";

export function AuthProvider(props: { children: ReactNode }) {
  const authQuery = useAuthQuery();
  const setUser = useSetAtom(userAtom);
  const setUserId = useSetAtom(userIdAtom);
  const setLoading = useSetAtom(isLoadingAuthAtom);

  useEffect(() => {
    setUser(authQuery.data ?? null);
    setUserId(authQuery.data?.id ?? null);
    setLoading(false);
  }, [authQuery.data, setUser, setUserId, setLoading]);

  return props.children;
}
