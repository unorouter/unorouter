import { DocsTabs } from "@/components/layout/docs/docs-tabs";
import { SidebarLayout } from "@/components/layout/sidebar/sidebar-layout";
import { BestKeyPrefetch } from "@/components/provider/state/best-key-prefetch";
import { Suspense } from "react";

interface DocsLayoutProps {
  children: React.ReactNode;
}

export default function DocsLayout(props: DocsLayoutProps) {
  return (
    <>
      <Suspense>
        <BestKeyPrefetch />
      </Suspense>
      <SidebarLayout navConfig="docs" showSearch>
        <div className="flex w-full min-w-0 flex-col">
          <DocsTabs />
          {props.children}
        </div>
      </SidebarLayout>
    </>
  );
}
