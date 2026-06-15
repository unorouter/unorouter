    // Side-effect: extend the shared dayjs singleton so plugins are available in client bundles.
import "@/lib/utils/format/date";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

    // Root not-found.tsx requires a layout file even if it just passes children through.
export default function RootLayout(props: Props) {
  return props.children;
}
