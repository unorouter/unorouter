import { TesterShell } from "@/components/pages/navbar/model-tester/tester-shell";
import type { ReactNode } from "react";

export default function ModelTesterLayout(props: { children: ReactNode }) {
  return <TesterShell>{props.children}</TesterShell>;
}
