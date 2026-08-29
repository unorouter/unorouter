import {
  LegalDoc,
  type LegalDocSection,
} from "@/components/pages/legal/legal-doc";

const SECTIONS: LegalDocSection[] = [
  { title: "SERVICE_TITLE", para: { key: "SERVICE_CONTENT", values: true } },
  { title: "ELIGIBILITY_TITLE", para: { key: "ELIGIBILITY_CONTENT" } },
  { title: "ACCOUNTS_TITLE", para: { key: "ACCOUNTS_CONTENT" } },
  {
    title: "PAYMENT_TITLE",
    intro: { key: "PAYMENT_CONTENT_INTRO" },
    items: ["PAYMENT_CREDITS", "PAYMENT_REFUNDS", "PAYMENT_EXPIRATION"],
  },
  { title: "USER_CONTENT_TITLE", para: { key: "USER_CONTENT_CONTENT" } },
  { title: "PROHIBITED_TITLE", para: { key: "PROHIBITED_CONTENT" } },
  { title: "TERMINATION_TITLE", para: { key: "TERMINATION_CONTENT" } },
  { title: "IP_TITLE", para: { key: "IP_CONTENT", values: true } },
  { title: "DISCLAIMER_TITLE", para: { key: "DISCLAIMER_CONTENT" } },
  {
    title: "LIABILITY_TITLE",
    para: { key: "LIABILITY_CONTENT", values: true },
  },
  {
    title: "INDEMNIFICATION_TITLE",
    para: { key: "INDEMNIFICATION_CONTENT", values: true },
  },
  { title: "LAW_TITLE", para: { key: "LAW_CONTENT" } },
  { title: "CHANGES_TITLE", para: { key: "CHANGES_CONTENT" } },
  { title: "CONTACT_TITLE", para: { key: "CONTACT_CONTENT", values: true } },
];

export function TermsContent() {
  return <LegalDoc ns="TERMS" sections={SECTIONS} />;
}
