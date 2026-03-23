"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { search } from "@orama/orama";
import { restore } from "@orama/plugin-data-persistence";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";

type SearchResult = {
  title: string;
  description: string;
  url: string;
  category: string;
};

export function useSearchQueryIndex() {
  return useQuery({
    queryKey: queryKeys.searchIndex(),
    queryFn: async () => {
      const data = handleElysia(await rpc.api.search.get());
      return restore("json", JSON.stringify(data));
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useSearchQuery(query: string) {
  const locale = useLocale();
  const { data: db, isLoading: isIndexLoading } = useSearchQueryIndex();

  const searchQuery = useQuery({
    queryKey: [...queryKeys.searchIndex(), "results", locale, query],
    queryFn: async (): Promise<SearchResult[]> => {
      if (!db || !query.trim()) return [];

      const searchResult = await search(db, {
        term: query,
        where: { locale: { eq: locale } },
        limit: 10,
      });

      return searchResult.hits.map((hit) => ({
        title: hit.document.title as string,
        description: hit.document.description as string,
        url: hit.document.url as string,
        category: hit.document.category as string,
      }));
    },
    enabled: !!db && !!query.trim(),
    staleTime: 1000 * 60 * 5,
  });

  return {
    results: searchQuery.data ?? [],
    isLoading: isIndexLoading || searchQuery.isLoading,
    isIndexLoaded: !!db,
  };
}
