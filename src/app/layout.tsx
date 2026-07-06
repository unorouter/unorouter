import "@/lib/utils/format/date";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function RootLayout(props: Props) {
  return props.children;
}
