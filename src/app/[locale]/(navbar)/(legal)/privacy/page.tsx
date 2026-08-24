import { PrivacyContent } from "@/components/pages/legal/privacy-content";
import { LegalPage, legalMetadata } from "@/components/pages/legal/legal-page";

export function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  return legalMetadata("privacy", props);
}

export default async function PrivacyPage(props: {
  params: Promise<{ locale: string }>;
}) {
  return (
    <LegalPage slug="privacy" params={props.params}>
      <PrivacyContent />
    </LegalPage>
  );
}
