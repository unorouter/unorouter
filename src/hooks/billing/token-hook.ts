"use client";

import { useApiMutation, useElysiaQuery } from "@/lib/react-query/hooks";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs, EdenQuery } from "@/lib/types/eden";
import { DataTableId } from "@/lib/types/enums";
import { handleElysia } from "@/lib/utils/base";
import { createTableAtoms } from "@/store/data-table-store";
import { useAtomValue } from "jotai";

type TokenRoute = typeof rpc.api.billing.token;

const tokenTableAtoms = createTableAtoms(DataTableId.TOKENS);

function useTokenTableQueryKey() {
  const store = useAtomValue(tokenTableAtoms.baseAtom);
  return queryKeys.tokens({
    p: store.pagination.pageIndex + 1,
    keyword: store.globalFilter || undefined,
  });
}

export function useBestKeyQuery() {
  const authQuery = useAuthQuery();
  return useElysiaQuery(
    queryKeys.bestKey(),
    () => rpc.api.billing.token["best-key"].get(),
    {
      enabled: !!authQuery.data,
      select: (data) => (data?.key ? `sk-${data.key}` : null),
    },
  );
}

export function useTokensQuery(query?: EdenQuery<TokenRoute["search"]>) {
  const authQuery = useAuthQuery();
  return useElysiaQuery(
    queryKeys.tokens(query),
    () => rpc.api.billing.token.search.get({ query }),
    { enabled: !!authQuery.data },
  );
}

export function useUserGroupsQuery() {
  const authQuery = useAuthQuery();
  return useElysiaQuery(
    queryKeys.userGroups(),
    () => rpc.api.billing.token.groups.get(),
    { enabled: !!authQuery.data },
  );
}

export function useCreateTokenMutation() {
  const queryKey = useTokenTableQueryKey();
  return useApiMutation({
    mutationFn: async (args: EdenArgs<TokenRoute, "post">) =>
      handleElysia(await rpc.api.billing.token.post(args.body)),
    invalidates: [queryKey],
  });
}

export function useUpdateTokenMutation() {
  const queryKey = useTokenTableQueryKey();
  return useApiMutation({
    mutationFn: async (args: EdenArgs<TokenRoute, "put">) =>
      handleElysia(await rpc.api.billing.token.put(args.body)),
    invalidates: [queryKey],
  });
}

export function useToggleTokenStatusMutation() {
  const queryKey = useTokenTableQueryKey();
  return useApiMutation({
    mutationFn: async (args: EdenArgs<TokenRoute["status"], "put">) =>
      handleElysia(await rpc.api.billing.token.status.put(args.body)),
    invalidates: [queryKey],
  });
}

export function useFetchTokenKeyMutation() {
  return useApiMutation({
    mutationFn: async (args: { id: string | number }) =>
      handleElysia(await rpc.api.billing.token(args).key.post()),
  });
}

export function useDeleteTokenMutation() {
  const queryKey = useTokenTableQueryKey();
  return useApiMutation({
    mutationFn: async (args: { id: string | number }) =>
      handleElysia(await rpc.api.billing.token(args).delete()),
    invalidates: [queryKey],
  });
}
