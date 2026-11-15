import {
  LegalDoc,
  type LegalDocSection,
} from "@/components/pages/legal/legal-doc";

const SECTIONS: LegalDocSection[] = [
  {
    title: "COLLECTION_TITLE",
    subs: [
      { title: "COLLECTION_VOLUNTARY_TITLE", para: "COLLECTION_VOLUNTARY" },
      { title: "COLLECTION_AUTO_TITLE", para: "COLLECTION_AUTO" },
      { title: "COLLECTION_COOKIES_TITLE", para: "COLLECTION_COOKIES" },
      { title: "COLLECTION_ERRORS_TITLE", para: "COLLECTION_ERRORS" },
    ],
  },
  { title: "USE_TITLE", para: "USE_CONTENT" },
  {
    title: "SHARING_TITLE",
    para: "SHARING_CONTENT",
    outro: "SHARING_MODERATION",
  },
  {
    title: "TRAINING_TITLE",
    para: "TRAINING_CONTENT",
    outro: "TRAINING_OBJECTION",
  },
  { title: "RIGHTS_TITLE", para: "RIGHTS_CONTENT" },
  { title: "SECURITY_TITLE", para: "SECURITY_CONTENT" },
  { title: "THIRD_PARTY_TITLE", para: "THIRD_PARTY_CONTENT" },
  { title: "RETENTION_TITLE", para: "RETENTION_CONTENT" },
  { title: "CHILDREN_TITLE", para: "CHILDREN_CONTENT" },
  {
    title: "TRANSFERS_TITLE",
    para: "TRANSFERS_CONTENT",
    outro: "TRANSFERS_EMAIL",
  },
  { title: "CHANGES_TITLE", para: "CHANGES_CONTENT" },
  { title: "CONTACT_TITLE", para: "CONTACT_CONTENT" },
];

export function PrivacyContent() {
  return <LegalDoc ns="PRIVACY" sections={SECTIONS} />;
}
