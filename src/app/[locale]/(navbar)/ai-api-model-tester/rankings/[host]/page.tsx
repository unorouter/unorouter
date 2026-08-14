import { ProviderDetail } from "@/components/pages/navbar/model-tester/provider-detail";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { prefetchElysia } from "@/lib/react-query/prefetch";
import { rpc } from "@/lib/rpc";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

type Props = {
  params: Promise<{ locale: string; host: string }>;
};

export default async function ModelTesterProviderPage(props: Props) {
  const params = await props.params;
  const host = decodeURIComponent(params.host);
  const queryClient = getQueryClient();

  await prefetchElysia(
    queryClient,
    queryKeys.modelTesterProviderDetail(host),
    () => rpc.api.models["model-tester"].rankings({ host }).get(),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProviderDetail host={host} />
    </HydrationBoundary>
  );
}

