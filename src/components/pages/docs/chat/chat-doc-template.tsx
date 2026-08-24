import { DocTemplate, docKey } from "@/components/pages/docs/doc-template";
import { CHAT_DOCS, type ChatDoc } from "./chat-docs";

export const chatDocKey = docKey;

export async function ChatDocTemplate(props: {
  doc: ChatDoc;
  children: React.ReactNode;
}) {
  return (
    <DocTemplate
      doc={props.doc}
      docs={CHAT_DOCS}
      namespace="DOCS_CHAT"
      indexHref="/docs/chat"
    >
      {props.children}
    </DocTemplate>
  );
}
