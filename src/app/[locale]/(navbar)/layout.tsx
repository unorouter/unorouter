import { serverLocale } from "@/lib/utils/server";
import { Suspense } from "react";
import { ContentBoundary } from "@/components/elements/feedback/content-boundary";
import { Footer } from "@/components/layout/nav/footer";
import { NavAuth } from "@/components/layout/nav/nav-auth";
import { Navbar } from "@/components/layout/nav/navbar";
import { NavbarShellSkeleton } from "@/components/layout/nav/navbar-shell-skeleton";
import { getTranslations } from "next-intl/server";
import { NavLoginLink } from "@/components/layout/nav/nav-auth";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

// Layouts prerender independently of their pages, so each needs its own
// setRequestLocale for next-intl to stay static (via serverLocale).
// The Suspense boundary only matters on unknown-param fallback shells
// (tester [host] pages): Navbar/Footer read usePathname, which is request
// data there. Fully static routes still prerender the chrome into the shell.
export default async function NavbarLayout(props: Props) {
  await serverLocale(props);
  const t = await getTranslations();
  return (
    <Suspense>
      <Navbar
        authSlot={
          <Suspense fallback={<NavLoginLink label={t("NAV.LOG_IN")} />}>
            <NavAuth />
          </Suspense>
        }
      />
      <main className="flex-1">
        <ContentBoundary className="pt-20 pb-24">
          <Suspense fallback={<NavbarShellSkeleton />}>
            {props.children}
          </Suspense>
        </ContentBoundary>
      </main>
      <Footer />
    </Suspense>
  );
}
