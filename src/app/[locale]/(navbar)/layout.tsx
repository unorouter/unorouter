import { serverLocale } from "@/lib/utils/server";
import { Suspense } from "react";
import { ContentBoundary } from "@/components/elements/feedback/content-boundary";
import { Footer } from "@/components/layout/nav/footer";
import { NavAuth } from "@/components/layout/nav/nav-auth";
import { Navbar } from "@/components/layout/nav/navbar";
import { getTranslations } from "next-intl/server";
import { NavLoginLink } from "@/components/layout/nav/nav-auth";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

// Layouts render independently of their pages, so each needs its own
// setRequestLocale for next-intl (via serverLocale).
export default async function NavbarLayout(props: Props) {
  await serverLocale(props);
  const t = await getTranslations();
  return (
    <>
      <Navbar
        authSlot={
          <Suspense fallback={<NavLoginLink label={t("NAV.LOG_IN")} />}>
            <NavAuth />
          </Suspense>
        }
      />
      <main className="flex-1">
        <ContentBoundary className="pt-20 pb-24">
          {props.children}
        </ContentBoundary>
      </main>
      <Footer />
    </>
  );
}
