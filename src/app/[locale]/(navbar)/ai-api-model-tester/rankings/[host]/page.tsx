import { ProviderDetail } from "@/components/pages/navbar/model-tester/provider-detail";

export const dynamic = "force-dynamic";

export default async function ModelTesterProviderPage(props: {
  params: Promise<{ locale: string; host: string }>;
}) {
  const params = await props.params;
  return <ProviderDetail host={decodeURIComponent(params.host)} />;
}
