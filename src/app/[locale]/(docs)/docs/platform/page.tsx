import { DocIndexTemplate } from "@/components/pages/docs/doc-template";
import { docSections } from "@/components/pages/docs/doc-registry";
import {
  PLATFORM_DOC_SECTION_LABELS,
  PLATFORM_DOC_SECTION_ORDER,
  PLATFORM_DOCS,
} from "@/components/pages/docs/platform/platform-docs";
import { pageMetadata } from "@/lib/seo/metadata";

export function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  return pageMetadata({
    props,
    namespace: "DOCS_PLATFORM.INDEX",
    href: "/docs/platform",
    badge: "hero",
  });
}

export default function PlatformDocsIndexPage(props: {
  params: Promise<{ locale: string }>;
}) {
  return (
    <DocIndexTemplate
      params={props.params}
      namespace="DOCS_PLATFORM"
      href="/docs/platform"
      idPrefix="platform-docs"
      sections={docSections(
        PLATFORM_DOCS,
        PLATFORM_DOC_SECTION_ORDER,
        PLATFORM_DOC_SECTION_LABELS,
      )}
    />
  );
}
