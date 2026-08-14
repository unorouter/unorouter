import { RankingDetail } from "@/components/pages/navbar/model-tester/ranking-detail";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { prefetchElysia } from "@/lib/react-query/prefetch";
import { rpc } from "@/lib/rpc";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

type Props = {
  params: Promise<{ locale: string; host: string; model: string }>;
};

export default async function ModelTesterRankingPage(props: Props) {
  const params = await props.params;
  const host = decodeURIComponent(params.host);
  const model = decodeURIComponent(params.model);
  const queryClient = getQueryClient();

  await prefetchElysia(
    queryClient,
    queryKeys.modelTesterRankingDetail(host, model),
    () => rpc.api.models["model-tester"].rankings({ host })({ model }).get(),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <RankingDetail host={host} model={model} />
    </HydrationBoundary>
  );
}

