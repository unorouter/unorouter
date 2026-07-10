import { RankingDetail } from "@/components/pages/navbar/model-tester/ranking-detail";
import { Suspense } from "react";

type Props = {
  params: Promise<{ locale: string; host: string; model: string }>;
};

async function Inner(props: Props) {
  const params = await props.params;
  return (
    <RankingDetail
      host={decodeURIComponent(params.host)}
      model={decodeURIComponent(params.model)}
    />
  );
}

export default function ModelTesterRankingPage(props: Props) {
  return (
    <Suspense>
      <Inner params={props.params} />
    </Suspense>
  );
}
