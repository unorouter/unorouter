"use client";

import { fetchSelf, login, logout, register, verify2FA } from "@/lib/api/auth";
import { queryKeys } from "@/lib/react-query/keys";
import { AuthUser, userIdAtom } from "@/store/auth-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSetAtom } from "jotai";

export function useAuthQuery() {
  return useQuery<AuthUser | null>({
    queryKey: queryKeys.auth(),
    queryFn: async () => {
      const result = await fetchSelf();
      if (!result.success) return null;
      return result.data;
    },
    enabled: false,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();
  const setUserId = useSetAtom(userIdAtom);
  return useMutation({
    mutationFn: async (data: {
      username: string;
      password: string;
      turnstile?: string;
    }) => {
      const result = await login(data.username, data.password, data.turnstile);
      if (!result.success) throw new Error(result.message);
      if (result.data && "id" in result.data) {
        setUserId(result.data.id);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth() });
    },
  });
}

export function useVerify2FAMutation() {
  const queryClient = useQueryClient();
  const setUserId = useSetAtom(userIdAtom);
  return useMutation({
    mutationFn: async (code: string) => {
      const result = await verify2FA(code);
      if (!result.success) throw new Error(result.message);
      if (result.data && "id" in result.data) {
        setUserId(result.data.id);
      }
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
      const result = await register(
        data.username,
        data.password,
        data.email,
        data.verification_code,
        data.aff_code,
        data.turnstile,
      );
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  const setUserId = useSetAtom(userIdAtom);
  return useMutation({
    mutationFn: async () => {
      const result = await logout();
      if (!result.success) throw new Error(result.message);
      setUserId(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth() });
    },
  });
}
