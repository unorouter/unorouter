import { HistoryModelTests } from "@/components/pages/navbar/model-tester/history-model-tests";

type Props = {
  params: Promise<{ locale: string; host: string; model: string }>;
};

export default async function HistoryModelPage(props: Props) {
  const params = await props.params;
  return (
    <HistoryModelTests
      host={decodeURIComponent(params.host)}
      model={decodeURIComponent(params.model)}
    />
  );
}

