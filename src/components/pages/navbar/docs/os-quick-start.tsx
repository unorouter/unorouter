"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useApiKey } from "@/hooks/ui/use-api-key";
import { OS } from "@/lib/types/enums";
import type { ReactNode } from "react";
import { FaApple, FaLinux, FaWindows } from "react-icons/fa";

type Props = {
  variants: Record<OS, ReactNode>;
};

const osTabs = [
  { value: OS.WINDOWS, icon: FaWindows, label: "Windows" },
  { value: OS.MACOS, icon: FaApple, label: "macOS" },
  { value: OS.LINUX, icon: FaLinux, label: "Linux" },
];

export function OSQuickStart(props: Props) {
  const docs = useApiKey();

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
