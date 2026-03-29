"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const login = rpc.api.auth.login;

export function useAuthQuery() {
  return useQuery({
    queryKey: queryKeys.auth(),
    queryFn: async () => handleElysia(await rpc.api.auth.self.get()),
    enabled: false,
  });
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: async (args: EdenArgs<typeof rpc.api.auth.login, "post">) =>
      handleElysia(await rpc.api.auth.login.post(args.body)),
  });
}

export function useVerify2FAMutation() {
  return useMutation({
    mutationFn: async (args: EdenArgs<(typeof login)["2fa"], "post">) =>
      handleElysia(await rpc.api.auth.login["2fa"].post(args.body)),
  });
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: async (args: EdenArgs<typeof rpc.api.auth.register, "post">) =>
      handleElysia(await rpc.api.auth.register.post(args.body)),
  });
}

export function useSendVerificationMutation() {
  return useMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.auth.verification, "get">,
    ) =>
      handleElysia(await rpc.api.auth.verification.get({ query: args.query })),
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => handleElysia(await rpc.api.auth.logout.get()),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.auth(), null);
    },
  });
}
