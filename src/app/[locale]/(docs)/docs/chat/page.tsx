import {
  CHAT_DOC_SECTION_LABELS,
  CHAT_DOC_SECTION_ORDER,
  CHAT_DOCS,
} from "@/components/pages/docs/chat/chat-docs";
import { DocIndexTemplate } from "@/components/pages/docs/doc-template";
import { docSections } from "@/components/pages/docs/doc-registry";
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
  return (
    <DocIndexTemplate
      params={props.params}
      namespace="DOCS_CHAT"
      href="/docs/chat"
      idPrefix="chat-docs"
      sections={docSections(
        CHAT_DOCS,
        CHAT_DOC_SECTION_ORDER,
        CHAT_DOC_SECTION_LABELS,
      )}
    />
  );
}
