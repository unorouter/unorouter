"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import type { EdenArgs } from "@/lib/types/eden";
import { handleError } from "@/lib/utils/client";
import type {
  PasskeyStatusData,
  TwoFAStatusData,
  UserSelfData,
} from "@/openapi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

type TwoFA = (typeof rpc.api.auth.settings)["2fa"];

export function use2FAStatusQuery() {
  return useQuery({
    queryKey: queryKeys.twoFAStatus(),
    queryFn: async () => {
      return handleElysia(await rpc.api.auth.settings["2fa"].status.get());
    },
  });
}

export function usePasskeyStatusQuery() {
  return useQuery({
    queryKey: queryKeys.passkeyStatus(),
    queryFn: async () => {
      return handleElysia(await rpc.api.auth.settings.passkey.get());
    },
  });
}

export function useGenerateAccessTokenMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async () => {
      return handleElysia(await rpc.api.auth.settings.token.get());
    },
    onError: (e) => handleError(e, t),
  });
}

export function useBindEmailMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.auth.settings.email.bind, "get">,
    ) => {
      return handleElysia(
        await rpc.api.auth.settings.email.bind.get({ query: args.query }),
      );
    },
    onError: (e) => handleError(e, t),
    onSuccess: (_, args) => {
      queryClient.setQueryData<UserSelfData>(queryKeys.auth(), (old) =>
        old ? { ...old, email: args.query.email } : old,
      );
    },
  });
}

type OAuthBindingField = "github_id" | "discord_id";

const oauthBindingFieldMap: Record<string, OAuthBindingField> = {
  github: "github_id",
  discord: "discord_id",
};

export function useUnbindOAuthMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: { bindingType: "github" | "discord" }) => {
      return handleElysia(
        await rpc.api.auth.account
          .bindings({ binding_type: args.bindingType })
          .delete(),
      );
    },
    onError: (e) => handleError(e, t),
    onSuccess: (_, args) => {
      const field = oauthBindingFieldMap[args.bindingType];
      queryClient.setQueryData<UserSelfData>(queryKeys.auth(), (old) =>
        old ? { ...old, [field]: "" } : old,
      );
    },
  });
}

export function useUpdateSelfMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.auth.settings.self, "put">,
    ) => {
      return handleElysia(await rpc.api.auth.settings.self.put(args.body));
    },
    onError: (e) => handleError(e, t),
    onSuccess: (_, args) => {
      queryClient.setQueryData<UserSelfData>(queryKeys.auth(), (old) =>
        old
          ? {
              ...old,
              ...(args.body.display_name && {
                display_name: args.body.display_name,
              }),
              ...(args.body.email && { email: args.body.email }),
            }
          : old,
      );
    },
  });
}

export function useDeleteSelfMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async () => {
      return handleElysia(await rpc.api.auth.settings.self.delete());
    },
    onError: (e) => handleError(e, t),
  });
}

export function useUpdateSettingMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.auth.settings.setting, "post">,
    ) => {
      return handleElysia(await rpc.api.auth.settings.setting.post(args.body));
    },
    onError: (e) => handleError(e, t),
    onSuccess: (_, args) => {
      queryClient.setQueryData<UserSelfData>(queryKeys.auth(), (old) =>
        old ? { ...old, ...args.body } : old,
      );
    },
  });
}

export function useSendSettingsVerificationMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.auth.settings.verification, "get">,
    ) => {
      return handleElysia(
        await rpc.api.auth.settings.verification.get({ query: args.query }),
      );
    },
    onError: (e) => handleError(e, t),
  });
}

export function useSetup2FAMutation() {
  const t = useTranslations();
  return useMutation({
    mutationFn: async () => {
      return handleElysia(await rpc.api.auth.settings["2fa"].setup.post());
    },
    onError: (e) => handleError(e, t),
  });
}

export function useEnable2FAMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: EdenArgs<TwoFA["enable"], "post">) => {
      return handleElysia(
        await rpc.api.auth.settings["2fa"].enable.post(args.body),
      );
    },
    onError: (e) => handleError(e, t),
    onSuccess: () => {
      queryClient.setQueryData<TwoFAStatusData>(
        queryKeys.twoFAStatus(),
        (old) => (old ? { ...old, enabled: true } : old),
      );
    },
  });
}

export function useDisable2FAMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: EdenArgs<TwoFA["disable"], "post">) => {
      return handleElysia(
        await rpc.api.auth.settings["2fa"].disable.post(args.body),
      );
    },
    onError: (e) => handleError(e, t),
    onSuccess: () => {
      queryClient.setQueryData<TwoFAStatusData>(
        queryKeys.twoFAStatus(),
        (old) => (old ? { ...old, enabled: false } : old),
      );
    },
  });
}

export function usePasskeyRegisterBeginMutation() {
  return useMutation({
    mutationFn: async () => {
      return handleElysia(
        await rpc.api.auth.settings.passkey.register.begin.post(),
      );
    },
  });
}

export function usePasskeyRegisterFinishMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<
        typeof rpc.api.auth.settings.passkey.register.finish,
        "post"
      >,
    ) => {
      return handleElysia(
        await rpc.api.auth.settings.passkey.register.finish.post(args.body),
      );
    },
    onError: (e) => handleError(e, t),
    onSuccess: () => {
      queryClient.setQueryData<PasskeyStatusData>(
        queryKeys.passkeyStatus(),
        (old) => (old ? { ...old, enabled: true } : old),
      );
    },
  });
}

export function usePasskeyDeleteMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return handleElysia(await rpc.api.auth.settings.passkey.delete());
    },
    onError: (e) => handleError(e, t),
    onSuccess: () => {
      queryClient.setQueryData<PasskeyStatusData>(
        queryKeys.passkeyStatus(),
        (old) => (old ? { ...old, enabled: false } : old),
      );
    },
  });
}
