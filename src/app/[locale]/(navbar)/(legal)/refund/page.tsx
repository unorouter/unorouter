import { RefundContent } from "@/components/pages/legal/refund-content";
import { LegalPage, legalMetadata } from "@/components/pages/legal/legal-page";

export function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  return legalMetadata("refund", props);
}

export default async function RefundPage(props: {
  params: Promise<{ locale: string }>;
}) {
  return (
    <LegalPage slug="refund" params={props.params}>
      <RefundContent />
    </LegalPage>
  );
}
