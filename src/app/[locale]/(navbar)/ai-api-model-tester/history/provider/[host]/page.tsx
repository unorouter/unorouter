import { HistoryProviderDetail } from "@/components/pages/navbar/model-tester/history-provider-detail";

type Props = {
  params: Promise<{ locale: string; host: string }>;
};

export default async function HistoryProviderPage(props: Props) {
  const params = await props.params;
  return <HistoryProviderDetail host={decodeURIComponent(params.host)} />;
}

