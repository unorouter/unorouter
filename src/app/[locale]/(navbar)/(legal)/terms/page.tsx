import { TermsContent } from "@/components/pages/legal/terms-content";
import { LegalPage, legalMetadata } from "@/components/pages/legal/legal-page";

export function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  return legalMetadata("terms", props);
}

export default async function TermsPage(props: {
  params: Promise<{ locale: string }>;
}) {
  return (
    <LegalPage slug="terms" params={props.params}>
      <TermsContent />
    </LegalPage>
  );
}
