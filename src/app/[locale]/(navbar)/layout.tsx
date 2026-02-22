import { Navbar } from "@/components/navbar";

type Props = {
  children: React.ReactNode;
};

export default function NavbarLayout(props: Props) {
  return (
    <>
      <Navbar />
      <main className="flex-1">{props.children}</main>
    </>
  );
}
