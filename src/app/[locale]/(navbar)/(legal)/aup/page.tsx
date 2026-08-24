import { AupContent } from "@/components/pages/legal/aup-content";
import { LegalPage, legalMetadata } from "@/components/pages/legal/legal-page";

export function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  return legalMetadata("aup", props);
}

export default async function AupPage(props: {
  params: Promise<{ locale: string }>;
}) {
  return (
    <LegalPage slug="aup" params={props.params}>
      <AupContent />
    </LegalPage>
  );
}
