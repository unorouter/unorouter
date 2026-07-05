import { ContentBoundary } from "@/components/elements/feedback/content-boundary";
import { Footer } from "@/components/layout/nav/footer";
import { Navbar } from "@/components/layout/nav/navbar";

type Props = {
  children: React.ReactNode;
};

export default function NavbarLayout(props: Props) {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <ContentBoundary className="pt-20 pb-24">
          {props.children}
        </ContentBoundary>
      </main>
      <Footer />
    </>
  );
}
