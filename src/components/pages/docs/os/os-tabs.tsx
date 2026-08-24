"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiKey } from "@/hooks/ui/use-api-key";
import { analytics } from "@/lib/analytics";
import { isOS, OS } from "@/lib/types/enums";
import type { ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
interface OSTabsProps {
  windowsContent: ReactNode;
  macosContent: ReactNode;
  linuxContent: ReactNode;
  labels: {
    windows: string;
    macos: string;
    linux: string;
  };
}

export function OSTabs(props: OSTabsProps) {
  const docs = useApiKey();

  return (
    <Tabs
      value={docs.os}
      onValueChange={(v) => {
        analytics.docs.osTabChanged({ os: v });
        if (isOS(v)) docs.setOs(v);
      }}
      className="mt-8"
    >
      <TabsList variant="line">
        <TabsTrigger value={OS.WINDOWS}>
          <Icon name="brand-windows" className="size-3.5" />
          {props.labels.windows}
        </TabsTrigger>
        <TabsTrigger value={OS.MACOS}>
          <Icon name="brand-apple" className="size-3.5" />
          {props.labels.macos}
        </TabsTrigger>
        <TabsTrigger value={OS.LINUX}>
          <Icon name="brand-linux" className="size-3.5" />
          {props.labels.linux}
        </TabsTrigger>
      </TabsList>

      <TabsContent value={OS.WINDOWS}>{props.windowsContent}</TabsContent>
      <TabsContent value={OS.MACOS}>{props.macosContent}</TabsContent>
      <TabsContent value={OS.LINUX}>{props.linuxContent}</TabsContent>
    </Tabs>
  );
}
