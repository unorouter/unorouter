import { PublishedTestDetail } from "@/components/pages/navbar/model-tester/published-test-detail";

export const dynamic = "force-dynamic";

export default async function PublishedTestPage(props: {
  params: Promise<{ locale: string; host: string; model: string; test: string }>;
}) {
  const params = await props.params;
  return (
    <PublishedTestDetail
      host={decodeURIComponent(params.host)}
      model={decodeURIComponent(params.model)}
      testId={decodeURIComponent(params.test)}
    />
  );
}
