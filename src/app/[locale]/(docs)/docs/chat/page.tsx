import {
  CHAT_DOC_SECTION_LABELS,
  CHAT_DOC_SECTION_ORDER,
  chatDocsBySection,
} from "@/components/pages/docs/chat/chat-docs";
import { DocIndexTemplate } from "@/components/pages/docs/doc-template";
import { pageMetadata } from "@/lib/seo/metadata";

export function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  return pageMetadata({
    props,
    namespace: "DOCS_CHAT.INDEX",
    href: "/docs/chat",
    badge: "chat",
  });
}

export default function ChatDocsIndexPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const bySection = chatDocsBySection();
  return (
    <DocIndexTemplate
      params={props.params}
      namespace="DOCS_CHAT"
      href="/docs/chat"
      idPrefix="chat-docs"
      sections={CHAT_DOC_SECTION_ORDER.map((section) => ({
        labelKey: CHAT_DOC_SECTION_LABELS[section],
        docs: bySection[section],
      }))}
    />
  );
}
