import { HistoryModelTests } from "@/components/pages/navbar/model-tester/history-model-tests";
import { Suspense } from "react";

type Props = {
  params: Promise<{ locale: string; host: string; model: string }>;
};

async function Inner(props: Props) {
  const params = await props.params;
  return (
    <HistoryModelTests
      host={decodeURIComponent(params.host)}
      model={decodeURIComponent(params.model)}
    />
  );
}

export default function HistoryModelPage(props: Props) {
  return (
    <Suspense>
      <Inner params={props.params} />
    </Suspense>
  );
}
