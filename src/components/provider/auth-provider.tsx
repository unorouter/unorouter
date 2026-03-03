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
    if (authQuery.isSuccess) {
      setUser(authQuery.data);
      setLoading(false);
    } else if (authQuery.isError || authQuery.isFetched) {
      setUser(null);
      setLoading(false);
    }
  }, [authQuery.isSuccess, authQuery.isError, authQuery.isFetched, authQuery.data, setUser, setLoading]);

  return props.children;
}
