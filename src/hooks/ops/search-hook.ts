"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { isSearchDoc, type SearchResult } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";

function useSearchQueryIndex(locale: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.searchIndex(locale),
    queryFn: async () => {
      const [{ restore }, res] = await Promise.all([
        import("@orama/plugin-data-persistence"),
        fetch(`/search-index.${locale}.json`),
      ]);
      const data = await res.json();
      return restore("json", data);
    },
    enabled,
  });
}

export function useSearchQuery(query: string, enabled: boolean = true) {
  const locale = useLocale();
  const { data: db, isLoading: isIndexLoading } = useSearchQueryIndex(
    locale,
    enabled,
  );

  const searchQuery = useQuery({
    queryKey: queryKeys.searchResults(locale, query),
    queryFn: async (): Promise<SearchResult[]> => {
      if (!db || !query.trim()) return [];

      const { search } = await import("@orama/orama");
      const searchResult = await search(db, {
        term: query,
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
