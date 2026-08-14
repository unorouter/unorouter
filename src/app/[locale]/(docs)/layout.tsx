import { serverLocale } from "@/lib/utils/server";
import { DocsTabs } from "@/components/layout/docs/docs-tabs";
import { SidebarLayout } from "@/components/layout/sidebar/sidebar-layout";
import { AuthHydration } from "@/components/provider/state/auth-hydration";

interface DocsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function DocsLayout(props: DocsLayoutProps) {
  await serverLocale(props);
  return (
    <AuthHydration>
      <SidebarLayout navConfig="docs" showSearch>
        <div className="flex w-full min-w-0 flex-col">
          <DocsTabs />
          {props.children}
        </div>
      </SidebarLayout>
    </AuthHydration>
  );
}
