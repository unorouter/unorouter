"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useDocs } from "@/hooks/ui/use-docs";
import type { OS } from "@/store/docs-store";
import type { ReactNode } from "react";
import { FaApple, FaLinux, FaWindows } from "react-icons/fa";

type Props = {
  variants: Record<OS, ReactNode>;
};

const osTabs = [
  { value: "windows" as const, icon: FaWindows, label: "Windows" },
  { value: "macos" as const, icon: FaApple, label: "macOS" },
  { value: "linux" as const, icon: FaLinux, label: "Linux" },
];

export function OSQuickStart(props: Props) {
  const docs = useDocs();

  return (
    <Tabs
      value={docs.os}
      onValueChange={(v) => docs.setOs(v as OS)}
    >
      <TabsList variant="line">
        {osTabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            <tab.icon className="size-3" />
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {osTabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          {props.variants[tab.value]}
        </TabsContent>
      ))}
    </Tabs>
  );
}
