"use client";

import { useApiMutation, useElysiaQuery } from "@/lib/react-query/hooks";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";
import type {
  PasskeyStatusData,
  TwoFAStatusData,
  UserSelfData,
} from "@/openapi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { msg, SECURITY_PROOF_HEADER } from "@/lib/config/constants";
import type { SecurityScope } from "@/lib/api/typebox/settings";
import {
  createPasskeyCredential,
  getPasskeyAssertion,
} from "@/lib/utils/webauthn";
import { dayjs } from "@/lib/utils/format/date";

type TwoFA = (typeof rpc.api.auth.settings)["2fa"];

export function use2FAStatusQuery() {
  return useElysiaQuery(queryKeys.twoFAStatus(), () =>
    rpc.api.auth.settings["2fa"].status.get(),
  );
}

export function usePasskeyStatusQuery() {
  return useElysiaQuery(queryKeys.passkeyStatus(), () =>
    rpc.api.auth.settings.passkey.get(),
  );
}

export function useGenerateAccessTokenMutation() {
  return useApiMutation({
    mutationFn: async () =>
      handleElysia(await rpc.api.auth.settings.token.post()),
  });
}

export function useBindEmailMutation() {
  return useApiMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.auth.settings.email.bind, "post">,
    ) => handleElysia(await rpc.api.auth.settings.email.bind.post(args.body)),
    onSuccess: (_, args, qc) => {
      qc.setQueryData<UserSelfData>(queryKeys.auth(), (old) =>
        old ? { ...old, email: args.body.email } : old,
      );
    },
  });
}

type OAuthBindingField = "github_id" | "discord_id" | "google_id";

const oauthBindingFieldMap: Record<string, OAuthBindingField> = {
  github: "github_id",
  discord: "discord_id",
  google: "google_id",
};

export function useUnbindOAuthMutation() {
  return useApiMutation({
    mutationFn: async (args: {
      bindingType: "github" | "discord" | "google";
    }) =>
      handleElysia(
        await rpc.api.auth.account
          .bindings({ binding_type: args.bindingType })
          .delete(),
      ),
    onSuccess: (_, args, qc) => {
      const field = oauthBindingFieldMap[args.bindingType];
      qc.setQueryData<UserSelfData>(queryKeys.auth(), (old) =>
        old ? { ...old, [field]: "" } : old,
      );
    },
  });
}

export function useUpdateSelfMutation() {
  return useApiMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.auth.settings.self, "put">,
    ) => handleElysia(await rpc.api.auth.settings.self.put(args.body)),
    onSuccess: (_, args, qc) => {
      qc.setQueryData<UserSelfData>(queryKeys.auth(), (old) =>
        old
          ? {
              ...old,
              ...(args.body.display_name && {
                display_name: args.body.display_name,
              }),
              ...(args.body.email && { email: args.body.email }),
              ...(args.body.customer_type && {
                customer_type: args.body.customer_type,
                customer_type_at: dayjs().unix(),
              }),
            }
          : old,
      );
    },
  });
}

// Plain useMutation like the 2FA ones: a refused proof keeps the dialog on
// verification instead of only showing a toast.
export function useDeleteSelfMutation() {
  return useMutation({
    mutationFn: async (args: { proof: string }) =>
      handleElysia(
        await rpc.api.auth.settings.self.delete(undefined, {
          headers: { [SECURITY_PROOF_HEADER]: args.proof },
        }),
      ),
  });
}

export function useUpdateSettingMutation() {
  return useApiMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.auth.settings.setting, "post">,
    ) => handleElysia(await rpc.api.auth.settings.setting.post(args.body)),
    successKey: "SETTINGS.NOTIFICATIONS.SETTINGS_SAVED",
    invalidates: [queryKeys.auth()],
  });
}

export function useSendSettingsVerificationMutation() {
  return useApiMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.auth.account.verification, "get">,
    ) =>
      handleElysia(
        await rpc.api.auth.account.verification.get({ query: args.query }),
      ),
  });
}

// staleTime 0: the offered methods change as soon as a factor is added or removed.
export function useVerificationMethodsQuery(scope: SecurityScope) {
  return useElysiaQuery(
    queryKeys.verificationMethods(scope),
    () => rpc.api.auth.settings.verify.methods.get({ query: { scope } }),
    { staleTime: 0 },
  );
}

export function useSecurityVerifyMutation() {
  return useApiMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.auth.settings.verify, "post">,
    ) => handleElysia(await rpc.api.auth.settings.verify.post(args.body)),
  });
}

// Returns the OAuth state for a re-authentication whose callback lands on
// `redirect`, which carries the panel's nonce.
export function useOAuthVerifyStateMutation() {
  return useApiMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.auth.settings.verify.oauth, "get">,
    ) =>
      handleElysia(
        await rpc.api.auth.settings.verify.oauth.get({ query: args.query }),
      ),
  });
}

// Plain useMutation: a dismissed passkey prompt is not an error worth a toast,
// so the caller decides what to show.
export function usePasskeyVerifyMutation() {
  return useMutation({
    mutationFn: async (args: { scope: SecurityScope }) => {
      const begin = handleElysia(
        await rpc.api.auth.settings.passkey.verify.begin.post({
          scope: args.scope,
        }),
      );
      const credential = await getPasskeyAssertion(begin.options);
      if (!credential) throw new Error(msg("ERRORS.UNEXPECTED_RESPONSE"));
      return handleElysia(
        await rpc.api.auth.settings.passkey.verify.finish.post({
          flow_token: begin.flow_token,
          credential,
        }),
      );
    },
  });
}

// The three below use plain useMutation so a refused proof can send the user
// back to verification instead of only showing a toast.
export function useSetup2FAMutation() {
  return useMutation({
    mutationFn: async (args: { proof: string }) =>
      handleElysia(
        await rpc.api.auth.settings["2fa"].setup.post(undefined, {
          headers: { [SECURITY_PROOF_HEADER]: args.proof },
        }),
      ),
  });
}

export function useEnable2FAMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: EdenArgs<TwoFA["enable"], "post">) =>
      handleElysia(await rpc.api.auth.settings["2fa"].enable.post(args.body)),
    onSuccess: () => {
      qc.setQueryData<TwoFAStatusData>(queryKeys.twoFAStatus(), (old) =>
        old ? { ...old, enabled: true } : old,
      );
    },
  });
}

export function useDisable2FAMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { proof: string }) =>
      handleElysia(
        await rpc.api.auth.settings["2fa"].disable.post(undefined, {
          headers: { [SECURITY_PROOF_HEADER]: args.proof },
        }),
      ),
    onSuccess: () => {
      qc.setQueryData<TwoFAStatusData>(queryKeys.twoFAStatus(), (old) =>
        old ? { ...old, enabled: false } : old,
      );
    },
  });
}

// Plain useMutation like the 2FA ones: a refused proof re-prompts verification
// and a dismissed browser prompt is not an error.
export function usePasskeyRegisterMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { proof: string }) => {
      const begin = handleElysia(
        await rpc.api.auth.settings.passkey.register.begin.post(undefined, {
          headers: { [SECURITY_PROOF_HEADER]: args.proof },
        }),
      );
      const credential = await createPasskeyCredential(begin.options);
      if (!credential || !begin.flow_token)
        throw new Error(msg("ERRORS.UNEXPECTED_RESPONSE"));
      return handleElysia(
        await rpc.api.auth.settings.passkey.register.finish.post({
          flow_token: begin.flow_token,
          credential,
        }),
      );
    },
    onSuccess: () => {
      qc.setQueryData<PasskeyStatusData>(queryKeys.passkeyStatus(), (old) =>
        old ? { ...old, enabled: true } : old,
      );
    },
  });
}

export function usePasskeyDeleteMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { proof: string }) =>
      handleElysia(
        await rpc.api.auth.settings.passkey.delete(undefined, {
          headers: { [SECURITY_PROOF_HEADER]: args.proof },
        }),
      ),
    onSuccess: () => {
      qc.setQueryData<PasskeyStatusData>(queryKeys.passkeyStatus(), (old) =>
        old ? { ...old, enabled: false } : old,
      );
    },
  });
}

export function useUpdateTimeoutMutation() {
  return useApiMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.auth.settings.timeout, "put">,
    ) => handleElysia(await rpc.api.auth.settings.timeout.put(args.body)),
    onSuccess: (_, __, qc) => {
      // The values live inside the `setting` JSON blob on the auth row, so patch
      // by refetch rather than reconstructing that string here.
      qc.invalidateQueries({ queryKey: queryKeys.auth() });
    },
  });
}
