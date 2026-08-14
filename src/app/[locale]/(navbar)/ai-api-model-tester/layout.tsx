import { TesterShell } from "@/components/pages/navbar/model-tester/run/tester-shell";
import type { ReactNode } from "react";

export default async function ModelTesterLayout(props: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  return <TesterShell>{props.children}</TesterShell>;
}
