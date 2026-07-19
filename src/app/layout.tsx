import "@/lib/utils/format/date";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function RootLayout(props: Props) {
  return <NuqsAdapter>{props.children}</NuqsAdapter>;
}
