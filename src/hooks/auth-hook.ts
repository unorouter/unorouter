"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useAuthQuery() {
  return useQuery({
    queryKey: queryKeys.auth(),
    queryFn: async () => handleElysia(await rpc.api.auth.self.get()),
    enabled: false,
  });
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: async (data: {
      username: string;
      password: string;
      turnstile?: string;
    }) => handleElysia(await rpc.api.auth.login.post(data)),
  });
}

export function useVerify2FAMutation() {
  return useMutation({
    mutationFn: async (code: string) =>
      handleElysia(await rpc.api.auth.login["2fa"].post({ code })),
  });
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: async (data: {
      username: string;
      password: string;
      email?: string;
      verification_code?: string;
      aff_code?: string;
      turnstile?: string;
    }) => handleElysia(await rpc.api.auth.register.post(data)),
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => handleElysia(await rpc.api.auth.logout.get()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth() });
    },
  });
}
