import { HistoryModelTests } from "@/components/pages/navbar/model-tester/history-model-tests";

export const dynamic = "force-dynamic";

export default async function HistoryModelPage(props: {
  params: Promise<{ locale: string; host: string; model: string }>;
}) {
  const params = await props.params;
  return (
    <HistoryModelTests
      host={decodeURIComponent(params.host)}
      model={decodeURIComponent(params.model)}
    />
  );
}
