import { SidebarLayout } from "@/components/layout/sidebar/sidebar-layout";
import { AuthRedirectCleanup } from "@/components/provider/app/auth-redirect-cleanup";
import { GenerationList } from "@/components/pages/sidebar/generate/generation-list";
import { rpc } from "@/lib/rpc";
import { setCookies } from "@/lib/utils/server";
import { redirect } from "next/navigation";

// Generate route group: mirrors the (chat) layout shape with a sidebar rail
// (GenerationList) in place of the conversation list. Lives outside
// (sidebar) so the rail can occupy the slot below the nav, like chat does.
export default async function GenerateGroupLayout(props: {
  children: React.ReactNode;
}) {
  const response = await rpc.api.auth.self.get(await setCookies());
  if (response.status !== 200) redirect("/login");

  return (
    <SidebarLayout
      before={<AuthRedirectCleanup />}
      navConfig="generate"
      chatContent={<GenerationList />}
    >
      {props.children}
    </SidebarLayout>
  );
}
