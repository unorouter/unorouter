import {
  LegalDoc,
  type LegalDocSection,
} from "@/components/pages/legal/legal-doc";

const SECTIONS: LegalDocSection[] = [
  { title: "SERVICE_TITLE", para: "SERVICE_CONTENT" },
  { title: "ELIGIBILITY_TITLE", para: "ELIGIBILITY_CONTENT" },
  { title: "ACCOUNTS_TITLE", para: "ACCOUNTS_CONTENT" },
  {
    title: "PAYMENT_TITLE",
    intro: "PAYMENT_CONTENT_INTRO",
    items: ["PAYMENT_CREDITS", "PAYMENT_REFUNDS", "PAYMENT_EXPIRATION"],
  },
  { title: "USER_CONTENT_TITLE", para: "USER_CONTENT_CONTENT" },
  {
    title: "THIRD_COUNTRIES_TITLE",
    para: "THIRD_COUNTRIES_CONTENT",
  },
  { title: "PROHIBITED_TITLE", para: "PROHIBITED_CONTENT" },
  { title: "TERMINATION_TITLE", para: "TERMINATION_CONTENT" },
  { title: "IP_TITLE", para: "IP_CONTENT" },
  { title: "DISCLAIMER_TITLE", para: "DISCLAIMER_CONTENT" },
  {
    title: "LIABILITY_TITLE",
    para: "LIABILITY_CONTENT",
  },
  {
    title: "INDEMNIFICATION_TITLE",
    para: "INDEMNIFICATION_CONTENT",
  },
  { title: "LAW_TITLE", para: "LAW_CONTENT" },
  { title: "CHANGES_TITLE", para: "CHANGES_CONTENT" },
  { title: "CONTACT_TITLE", para: "CONTACT_CONTENT" },
];

export function TermsContent() {
  return <LegalDoc ns="TERMS" sections={SECTIONS} />;
}
