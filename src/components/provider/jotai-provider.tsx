import { Provider } from "jotai";
import { ReactNode } from "react";

export function JotaiProvider(props: { children: ReactNode }) {
  return <Provider>{props.children}</Provider>;
}
