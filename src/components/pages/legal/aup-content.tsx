import {
  LegalDoc,
  type LegalDocSection,
} from "@/components/pages/legal/legal-doc";

const SECTIONS: LegalDocSection[] = [
  {
    title: "PROHIBITED_CONTENT_TITLE",
    para: { key: "PROHIBITED_CONTENT_CONTENT" },
  },
  {
    title: "PROHIBITED_DEEPFAKE_TITLE",
    para: { key: "PROHIBITED_DEEPFAKE_CONTENT" },
  },
  { title: "PROHIBITED_HARM_TITLE", para: { key: "PROHIBITED_HARM_CONTENT" } },
  {
    title: "UPSTREAM_MODERATION_TITLE",
    para: { key: "UPSTREAM_MODERATION_CONTENT", values: true },
  },
  { title: "ENFORCEMENT_TITLE", para: { key: "ENFORCEMENT_CONTENT" } },
  { title: "CHANGES_TITLE", para: { key: "CHANGES_CONTENT" } },
  { title: "CONTACT_TITLE", para: { key: "CONTACT_CONTENT", values: true } },
];

export function AupContent() {
  return <LegalDoc ns="AUP" sections={SECTIONS} />;
}
