"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils";
import { AuthUser } from "@/store/auth-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useAuthQuery() {
  return useQuery<AuthUser | null>({
    queryKey: queryKeys.auth(),
    queryFn: async () => {
      const result = handleElysia(await rpc.api.auth.self.get()) as {
        success: boolean;
        data: AuthUser;
      };
      if (!result?.success) return null;
      return result.data;
    },
    enabled: false,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      username: string;
      password: string;
      turnstile?: string;
    }) => {
      const result = handleElysia(await rpc.api.auth.login.post(data)) as {
        success: boolean;
        message: string;
        data: AuthUser | { require_2fa: true };
      };
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth() });
    },
  });
}

export function useVerify2FAMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const result = handleElysia(
        await rpc.api.auth.login["2fa"].post({ code }),
      ) as { success: boolean; message: string; data: AuthUser };
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth() });
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
    }) => {
      const result = handleElysia(await rpc.api.auth.register.post(data)) as {
        success: boolean;
        message: string;
        data: null;
      };
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = handleElysia(await rpc.api.auth.logout.get()) as {
        success: boolean;
        message: string;
      };
      if (!result.success) throw new Error(result.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth() });
    },
  });
}
