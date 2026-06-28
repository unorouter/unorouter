import { RankingDetail } from "@/components/pages/navbar/model-tester/ranking-detail";

export const dynamic = "force-dynamic";

export default async function ModelTesterRankingPage(props: {
  params: Promise<{ locale: string; host: string; model: string }>;
}) {
  const params = await props.params;
  return (
    <RankingDetail
      host={decodeURIComponent(params.host)}
      model={decodeURIComponent(params.model)}
    />
  );
}
