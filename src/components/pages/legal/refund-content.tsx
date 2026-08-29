import {
  LegalDoc,
  type LegalDocSection,
} from "@/components/pages/legal/legal-doc";

const SECTIONS: LegalDocSection[] = [
  { title: "PAYMENTS_TITLE", para: { key: "PAYMENTS_CONTENT" } },
  {
    title: "ELIGIBILITY_TITLE",
    intro: { key: "ELIGIBILITY_INTRO" },
    items: [
      "ELIGIBILITY_WINDOW",
      "ELIGIBILITY_USAGE",
      "ELIGIBILITY_COMPLIANCE",
    ],
  },
  {
    title: "NON_REFUNDABLE_TITLE",
    intro: { key: "NON_REFUNDABLE_INTRO" },
    items: [
      "NON_REFUNDABLE_PARTIAL",
      "NON_REFUNDABLE_FEES",
      "NON_REFUNDABLE_TERMINATED",
    ],
  },
  {
    title: "REQUEST_TITLE",
    intro: { key: "REQUEST_INTRO", values: true },
    items: ["REQUEST_ACCOUNT", "REQUEST_PROOF", "REQUEST_REASON"],
    outro: { key: "REQUEST_VERIFY" },
  },
  { title: "PROCESSING_TITLE", para: { key: "PROCESSING_CONTENT" } },
  { title: "LAW_TITLE", para: { key: "LAW_CONTENT" } },
  { title: "CHANGES_TITLE", para: { key: "CHANGES_CONTENT" } },
  { title: "CONTACT_TITLE", para: { key: "CONTACT_CONTENT", values: true } },
];

export function RefundContent() {
  return <LegalDoc ns="REFUND" sections={SECTIONS} />;
}
