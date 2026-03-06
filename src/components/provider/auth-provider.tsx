"use client";

import { useAuthQuery } from "@/hooks/auth-hook";
import { isLoadingAuthAtom, userAtom } from "@/store/auth-store";
import { useSetAtom } from "jotai";
import { ReactNode, useEffect } from "react";

export function AuthProvider(props: { children: ReactNode }) {
  const authQuery = useAuthQuery();
  const setUser = useSetAtom(userAtom);
  const setLoading = useSetAtom(isLoadingAuthAtom);

  useEffect(() => {
    setUser(authQuery.data ?? null);
    setLoading(false);
  }, [authQuery.data, setUser, setLoading]);

  return props.children;
}
