// Side-effect: extend the shared dayjs singleton so plugins are available
// for any `import dayjs from "dayjs"` call in client bundles.
import "@/lib/utils/date";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

// Since we have a `not-found.tsx` page on the root, a layout file
// is required, even if it's just passing children through.
export default function RootLayout(props: Props) {
  return props.children;
}
