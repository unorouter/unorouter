import { ConsentsPage } from "@/components/pages/navbar/consents/consents-page";
import { pageMetadata } from "@/lib/seo/metadata";

export function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  return pageMetadata({
    props,
    namespace: "CONSENT",
    href: "/consents",
    robots: false,
  });
}

export default function Page() {
  return <ConsentsPage />;
}
