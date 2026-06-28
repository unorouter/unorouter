import { TesterShell } from "@/components/pages/navbar/model-tester/tester-shell";
import type { ReactNode } from "react";

// Shared shell for every model-tester page (test, history, rankings, and their
// detail pages): hero, sub-nav tabs, container, open-source block.
export default function ModelTesterLayout(props: { children: ReactNode }) {
  return <TesterShell>{props.children}</TesterShell>;
}
