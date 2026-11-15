import {
  LegalDoc,
  type LegalDocSection,
} from "@/components/pages/legal/legal-doc";

const SECTIONS: LegalDocSection[] = [
  { title: "PAYMENTS_TITLE", para: "PAYMENTS_CONTENT" },
  {
    title: "ELIGIBILITY_TITLE",
    intro: "ELIGIBILITY_INTRO",
    items: [
      "ELIGIBILITY_WINDOW",
      "ELIGIBILITY_USAGE",
      "ELIGIBILITY_COMPLIANCE",
    ],
  },
  {
    title: "NON_REFUNDABLE_TITLE",
    intro: "NON_REFUNDABLE_INTRO",
    items: [
      "NON_REFUNDABLE_PARTIAL",
      "NON_REFUNDABLE_FEES",
      "NON_REFUNDABLE_TERMINATED",
    ],
  },
  {
    title: "REQUEST_TITLE",
    intro: "REQUEST_INTRO",
    items: ["REQUEST_ACCOUNT", "REQUEST_PROOF", "REQUEST_REASON"],
    outro: "REQUEST_VERIFY",
  },
  { title: "PROCESSING_TITLE", para: "PROCESSING_CONTENT" },
  { title: "LAW_TITLE", para: "LAW_CONTENT" },
  { title: "CHANGES_TITLE", para: "CHANGES_CONTENT" },
  { title: "CONTACT_TITLE", para: "CONTACT_CONTENT" },
];

export function RefundContent() {
  return <LegalDoc ns="REFUND" sections={SECTIONS} />;
}
