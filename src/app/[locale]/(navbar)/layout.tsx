import { ContentBoundary } from "@/components/elements/feedback/content-boundary";
import { Footer } from "@/components/layout/nav/footer";
import { NavAuth } from "@/components/layout/nav/nav-auth";
import { Navbar } from "@/components/layout/nav/navbar";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function NavbarLayout(props: Props) {
  return (
    <>
      <Navbar authSlot={<NavAuth />} />
      {/* bg-background is what the wallpaper theme tints down to panelOpacity.
          Without it these pages have no surface at all and the image runs
          straight behind the tables. SidebarInset gives the other groups theirs. */}
      <main className="bg-background flex-1">
        <ContentBoundary className="pt-20 pb-24">
          {props.children}
        </ContentBoundary>
      </main>
      {/* The footer paints bg-muted/30, and the theme's tint rule matches the
          bare .bg-muted class, not the /30 opacity variant, so it never gets a
          surface of its own and the wallpaper runs through it. */}
      <div className="bg-background">
        <Footer />
      </div>
    </>
  );
}
