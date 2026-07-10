import { environmentManager, QueryClient } from "@tanstack/react-query";
import { cache } from "react";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        // "static", not Infinity: useQuery's staleness check reads the clock,
        // which cacheComponents prerenders reject in client components.
        staleTime: "static",
      },
    },
  });
}

const getServerQueryClient = cache(makeQueryClient);

let browserQueryClient: QueryClient | undefined = undefined;

export default function getQueryClient() {
  if (environmentManager.isServer()) {
    return getServerQueryClient();
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
