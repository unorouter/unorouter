"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiKey } from "@/hooks/ui/use-api-key";
import { isOS, OS } from "@/lib/types/enums";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/lib/config/icon-map";

type Props = {
  variants: Record<OS, ReactNode>;
};

const osTabs: { value: OS; icon: IconName; label: string }[] = [
  { value: OS.WINDOWS, icon: "brand-windows", label: "Windows" },
  { value: OS.MACOS, icon: "brand-apple", label: "macOS" },
  { value: OS.LINUX, icon: "brand-linux", label: "Linux" },
];

export function OSQuickStart(props: Props) {
  const docs = useApiKey();

  return (
    <Tabs value={docs.os} onValueChange={(v) => isOS(v) && docs.setOs(v)}>
      <TabsList variant="line">
        {osTabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            <Icon name={tab.icon} className="size-3" />
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
