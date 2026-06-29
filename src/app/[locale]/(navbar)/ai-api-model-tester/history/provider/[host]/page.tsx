import { HistoryProviderDetail } from "@/components/pages/navbar/model-tester/history-provider-detail";

export const dynamic = "force-dynamic";

export default async function HistoryProviderPage(props: {
  params: Promise<{ locale: string; host: string }>;
}) {
  const params = await props.params;
  return <HistoryProviderDetail host={decodeURIComponent(params.host)} />;
}
