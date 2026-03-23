import { SidebarLayout } from "@/components/layout/sidebar/sidebar-layout";

interface DocsLayoutProps {
  children: React.ReactNode;
}

export default function DocsLayout(props: DocsLayoutProps) {
  return (
    <SidebarLayout navConfig="docs" showSearch>
      {props.children}
    </SidebarLayout>
  );
}
