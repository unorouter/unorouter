"use client";

import { useApiMutation, useElysiaQuery } from "@/lib/react-query/hooks";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";

type AuthLogin = typeof rpc.api.auth.account.login;

export function useAuthQuery() {
  // Client-fetched after mount: streaming server auth state into the static
  // shell hydration-mismatches every auth-dependent shell component (navbar
  // rendered logged-out on the server, logged-in at hydration). retry off:
  // anonymous sessions legitimately 401 here.
  return useElysiaQuery(
    queryKeys.auth(),
    () => rpc.api.auth.account.self.get(),
    { retry: false },
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
