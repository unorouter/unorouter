import { ProviderDetail } from "@/components/pages/navbar/model-tester/provider-detail";
import { Suspense } from "react";

type Props = {
  params: Promise<{ locale: string; host: string }>;
};

async function Inner(props: Props) {
  const params = await props.params;
  return <ProviderDetail host={decodeURIComponent(params.host)} />;
}

export default function ModelTesterProviderPage(props: Props) {
  return (
    <Suspense>
      <Inner params={props.params} />
    </Suspense>
  );
}
