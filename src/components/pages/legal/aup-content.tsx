import {
  LegalDoc,
  type LegalDocSection,
} from "@/components/pages/legal/legal-doc";

const SECTIONS: LegalDocSection[] = [
  {
    title: "PROHIBITED_CONTENT_TITLE",
    para: "PROHIBITED_CONTENT_CONTENT",
  },
  {
    title: "PROHIBITED_DEEPFAKE_TITLE",
    para: "PROHIBITED_DEEPFAKE_CONTENT",
  },
  { title: "PROHIBITED_HARM_TITLE", para: "PROHIBITED_HARM_CONTENT" },
  {
    title: "UPSTREAM_MODERATION_TITLE",
    para: "UPSTREAM_MODERATION_CONTENT",
  },
  { title: "ENFORCEMENT_TITLE", para: "ENFORCEMENT_CONTENT" },
  { title: "CHANGES_TITLE", para: "CHANGES_CONTENT" },
  { title: "CONTACT_TITLE", para: "CONTACT_CONTENT" },
];

export function AupContent() {
  return <LegalDoc ns="AUP" sections={SECTIONS} />;
}
