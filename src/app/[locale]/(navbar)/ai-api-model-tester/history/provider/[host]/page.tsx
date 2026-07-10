import { HistoryProviderDetail } from "@/components/pages/navbar/model-tester/history-provider-detail";
import { Suspense } from "react";

type Props = {
  params: Promise<{ locale: string; host: string }>;
};

async function Inner(props: Props) {
  const params = await props.params;
  return <HistoryProviderDetail host={decodeURIComponent(params.host)} />;
}

export default function HistoryProviderPage(props: Props) {
  return (
    <Suspense>
      <Inner params={props.params} />
    </Suspense>
  );
}
