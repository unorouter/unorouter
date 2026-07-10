import { serverLocale } from "@/lib/utils/server";
import { TesterShell } from "@/components/pages/navbar/model-tester/tester-shell";
import type { ReactNode } from "react";

export default async function ModelTesterLayout(props: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  await serverLocale(props);
  return <TesterShell>{props.children}</TesterShell>;
}
