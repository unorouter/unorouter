"use client";

import { useApiMutation, useElysiaQuery } from "@/lib/react-query/hooks";

import { USER_ID_COOKIE } from "@/lib/config/constants";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";
import { useEffect, useState } from "react";

type AuthLogin = typeof rpc.api.auth.account.login;

export function useAuthQuery() {
  // Auth is normally server-rendered into streamed holes (NavAuth, the
  // sidebar AuthGate, chat/playground AuthHydration); this client fetch is a
  // DELAYED fallback for pages without a hole (docs group), so the streamed
  // hydration wins the race and no request fires where a hole exists. Gated
  // on the session cookie: anonymous visitors make no request at all (the
  // 401 would land in the console and cost Lighthouse points).
  const [fallbackEnabled, setFallbackEnabled] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setFallbackEnabled(true), 2500);
    return () => clearTimeout(timer);
  }, []);
  const hasSession =
    typeof document !== "undefined" &&
    document.cookie.includes(`${USER_ID_COOKIE}=`);
  return useElysiaQuery(
    queryKeys.auth(),
    () => rpc.api.auth.account.self.get(),
    { enabled: hasSession && fallbackEnabled, retry: false },
  );
}

export function useLoginMutation() {
  return useApiMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.auth.account.login, "post">,
    ) => handleElysia(await rpc.api.auth.account.login.post(args.body)),
  });
}

export function useVerify2FAMutation() {
  return useApiMutation({
    mutationFn: async (args: EdenArgs<AuthLogin["2fa"], "post">) =>
      handleElysia(await rpc.api.auth.account.login["2fa"].post(args.body)),
  });
}

export function useRegisterMutation() {
  return useApiMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.auth.account.register, "post">,
    ) => handleElysia(await rpc.api.auth.account.register.post(args.body)),
  });
}

export function useSendVerificationMutation() {
  return useApiMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.auth.account.verification, "get">,
    ) =>
      handleElysia(
        await rpc.api.auth.account.verification.get({ query: args.query }),
      ),
  });
}

export function useLogoutMutation() {
  return useApiMutation({
    mutationFn: async () =>
      handleElysia(await rpc.api.auth.account.logout.get()),
    onSuccess: (_data, _vars, qc) => qc.setQueryData(queryKeys.auth(), null),
  });
}
