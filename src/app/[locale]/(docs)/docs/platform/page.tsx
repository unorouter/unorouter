import { DocIndexTemplate } from "@/components/pages/docs/doc-template";
import {
  PLATFORM_DOC_SECTION_LABELS,
  PLATFORM_DOC_SECTION_ORDER,
  platformDocsBySection,
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
  const bySection = platformDocsBySection();
  return (
    <DocIndexTemplate
      params={props.params}
      namespace="DOCS_PLATFORM"
      href="/docs/platform"
      idPrefix="platform-docs"
      sections={PLATFORM_DOC_SECTION_ORDER.map((section) => ({
        labelKey: PLATFORM_DOC_SECTION_LABELS[section],
        docs: bySection[section],
      }))}
    />
  );
}
