"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { isSearchDoc, type SearchResult } from "@/lib/types/search";
import { search } from "@orama/orama";
import { restore } from "@orama/plugin-data-persistence";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";

export function useSearchQueryIndex() {
  return useQuery({
    queryKey: queryKeys.searchIndex(),
    queryFn: async () => {
      const res = await fetch("/search-index.json");
      const data = await res.json();
      return restore("json", data);
    },
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

      return searchResult.hits
        .filter((hit) => isSearchDoc(hit.document))
        .map((hit) => hit.document as unknown as SearchResult);
    },
    enabled: !!db && !!query.trim(),
  });

  return {
    results: searchQuery.data ?? [],
    isLoading: isIndexLoading || searchQuery.isLoading,
    isIndexLoaded: !!db,
  };
}
