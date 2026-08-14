import { ContentBoundary } from "@/components/elements/feedback/content-boundary";
import { Footer } from "@/components/layout/nav/footer";
import { NavAuth } from "@/components/layout/nav/nav-auth";
import { Navbar } from "@/components/layout/nav/navbar";
import { serverLocale } from "@/lib/utils/server";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function NavbarLayout(props: Props) {
  await serverLocale(props);
  return (
    <>
      <Navbar authSlot={<NavAuth />} />
      <main className="flex-1">
        <ContentBoundary className="pt-20 pb-24">
          {props.children}
        </ContentBoundary>
      </main>
      <Footer />
    </>
  );
}
