import { DocTemplate, docKey } from "@/components/pages/docs/doc-template";
import { PLATFORM_DOCS, type PlatformDoc } from "./platform-docs";

export const platformDocKey = docKey;

export async function PlatformDocTemplate(props: {
  doc: PlatformDoc;
  children: React.ReactNode;
}) {
  return (
    <DocTemplate
      doc={props.doc}
      docs={PLATFORM_DOCS}
      namespace="DOCS_PLATFORM"
      indexHref="/docs/platform"
    >
      {props.children}
    </DocTemplate>
  );
}
