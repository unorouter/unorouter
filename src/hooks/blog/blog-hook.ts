"use client";

import type { CommentSort, ReactionKind } from "@/lib/api/typebox/blog";
import { useApiMutation, useElysiaQuery } from "@/lib/react-query/hooks";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useBlogComments(slug: string, sort: CommentSort) {
  return useElysiaQuery(queryKeys.blogComments(slug, sort), () =>
    rpc.api.blog.posts({ slug }).comments.get({ query: { sort } }),
  );
}

export function useBlogPostStats(slug: string) {
  return useElysiaQuery(queryKeys.blogPostStats(slug), () =>
    rpc.api.blog.posts({ slug }).stats.get(),
  );
}

export function useBlogStatsSummary() {
  return useElysiaQuery(queryKeys.blogStatsSummary(), () =>
    rpc.api.blog.stats.get(),
  );
}

// A view is bookkeeping; a rate-limited one must not raise an error toast.
export function useRecordBlogView(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      handleElysia(await rpc.api.blog.posts({ slug }).view.post()),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.blogPostStats(slug) }),
  });
}

export function useCreateBlogComment(slug: string) {
  return useApiMutation<{ id: string }, { body: string; parentId?: string }>({
    mutationFn: async (vars) =>
      handleElysia(await rpc.api.blog.posts({ slug }).comments.post(vars)),
    invalidates: [
      queryKeys.blogCommentsAll(slug),
      queryKeys.blogPostStats(slug),
      queryKeys.blogStatsSummary(),
    ],
  });
}

export function useVoteBlogComment(slug: string) {
  return useApiMutation<{ ok: true }, { id: string; value: 1 | 0 | -1 }>({
    mutationFn: async (vars) =>
      handleElysia(
        await rpc.api.blog
          .comments({ id: vars.id })
          .vote.post({ value: vars.value }),
      ),
    invalidates: [queryKeys.blogCommentsAll(slug)],
  });
}

export function useHideBlogComment(slug: string) {
  return useApiMutation<{ ok: true }, { id: string; hidden: boolean }>({
    mutationFn: async (vars) =>
      handleElysia(
        await rpc.api.blog
          .comments({ id: vars.id })
          .hide.post({ hidden: vars.hidden }),
      ),
    invalidates: [
      queryKeys.blogCommentsAll(slug),
      queryKeys.blogPostStats(slug),
      queryKeys.blogStatsSummary(),
    ],
  });
}

export function useToggleBlogReaction(slug: string) {
  return useApiMutation<{ active: boolean }, ReactionKind>({
    mutationFn: async (kind) =>
      handleElysia(await rpc.api.blog.posts({ slug }).react.post({ kind })),
    invalidates: [queryKeys.blogPostStats(slug), queryKeys.blogStatsSummary()],
  });
}
