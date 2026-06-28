import { ModelTestDetail } from "@/components/pages/navbar/model-tester/model-test-detail";

export const dynamic = "force-dynamic";

export default async function ModelTestHistoryPage(props: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const params = await props.params;
  return <ModelTestDetail id={params.id} />;
}
