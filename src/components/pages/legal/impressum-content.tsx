import {
  LegalDoc,
  type LegalDocSection,
} from "@/components/pages/legal/legal-doc";

const SECTIONS: LegalDocSection[] = [
  {
    title: "PROVIDER_TITLE",
    para: "PROVIDER_CONTENT",
  },
  { title: "CONTACT_TITLE", para: "CONTACT_CONTENT" },
  { title: "VAT_TITLE", para: "VAT_CONTENT" },
  {
    title: "RESPONSIBLE_TITLE",
    para: "RESPONSIBLE_CONTENT",
  },
  { title: "DISPUTE_TITLE", para: "DISPUTE_CONTENT" },
];

export function ImpressumContent() {
  return <LegalDoc ns="IMPRESSUM" sections={SECTIONS} />;
}
