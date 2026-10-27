"use client";

import { useApiMutation, useElysiaQuery } from "@/lib/react-query/hooks";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";

type ProviderConsents = (typeof rpc.api.auth)["provider-consents"];

export function useProviderConsentsQuery(enabled = true) {
  return useElysiaQuery(
    queryKeys.providerConsents(),
    () => rpc.api.auth["provider-consents"].get({ query: {} }),
    { enabled },
  );
}

// Only that model's consent-required providers, plus whether it is covered.
export function useModelProviderConsentsQuery(
  model: string | null,
  enabled = true,
) {
  return useElysiaQuery(
    queryKeys.providerConsentsForModel(model ?? ""),
    () =>
      rpc.api.auth["provider-consents"].get({ query: { model: model ?? "" } }),
    { enabled: enabled && !!model },
  );
}

export function useGrantProviderConsentMutation() {
  return useApiMutation({
    mutationFn: async (args: EdenArgs<ProviderConsents, "post">) =>
      handleElysia(await rpc.api.auth["provider-consents"].post(args.body)),
    invalidates: [queryKeys.providerConsents()],
  });
}

export function useRevokeProviderConsentMutation() {
  return useApiMutation({
    mutationFn: async (args: EdenArgs<ProviderConsents, "delete">) =>
      handleElysia(await rpc.api.auth["provider-consents"].delete(args.body)),
    invalidates: [queryKeys.providerConsents()],
  });
}
