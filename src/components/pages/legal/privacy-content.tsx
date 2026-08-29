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
    ],
  },
  { title: "USE_TITLE", para: { key: "USE_CONTENT" } },
  { title: "SHARING_TITLE", para: { key: "SHARING_CONTENT" } },
  { title: "RIGHTS_TITLE", para: { key: "RIGHTS_CONTENT", values: true } },
  { title: "SECURITY_TITLE", para: { key: "SECURITY_CONTENT" } },
  { title: "THIRD_PARTY_TITLE", para: { key: "THIRD_PARTY_CONTENT" } },
  { title: "RETENTION_TITLE", para: { key: "RETENTION_CONTENT" } },
  { title: "CHILDREN_TITLE", para: { key: "CHILDREN_CONTENT", values: true } },
  { title: "TRANSFERS_TITLE", para: { key: "TRANSFERS_CONTENT" } },
  { title: "CHANGES_TITLE", para: { key: "CHANGES_CONTENT" } },
  { title: "CONTACT_TITLE", para: { key: "CONTACT_CONTENT", values: true } },
];

export function PrivacyContent() {
  return <LegalDoc ns="PRIVACY" sections={SECTIONS} />;
}
