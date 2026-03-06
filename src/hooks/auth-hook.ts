"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useAuthQuery() {
  return useQuery({
    queryKey: queryKeys.auth(),
    queryFn: async () => handleElysia(await rpc.api.auth.self.get()),
    retry: false,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      username: string;
      password: string;
      turnstile?: string;
    }) => handleElysia(await rpc.api.auth.login.post(data)),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: queryKeys.auth() });
    },
  });
}

export function useVerify2FAMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) =>
      handleElysia(await rpc.api.auth.login["2fa"].post({ code })),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: queryKeys.auth() });
    },
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
