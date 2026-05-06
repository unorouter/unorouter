"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiKey } from "@/hooks/ui/use-api-key";
import { analytics } from "@/lib/analytics";
import { OS } from "@/lib/types/enums";
import type { ReactNode } from "react";
import { FaApple, FaLinux, FaWindows } from "react-icons/fa";

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
        docs.setOs(v as OS);
      }}
      className="mt-8"
    >
      <TabsList variant="line">
        <TabsTrigger value={OS.WINDOWS}>
          <FaWindows className="size-3.5" />
          {props.labels.windows}
        </TabsTrigger>
        <TabsTrigger value={OS.MACOS}>
          <FaApple className="size-3.5" />
          {props.labels.macos}
        </TabsTrigger>
        <TabsTrigger value={OS.LINUX}>
          <FaLinux className="size-3.5" />
          {props.labels.linux}
        </TabsTrigger>
      </TabsList>

      <TabsContent value={OS.WINDOWS}>{props.windowsContent}</TabsContent>
      <TabsContent value={OS.MACOS}>{props.macosContent}</TabsContent>
      <TabsContent value={OS.LINUX}>{props.linuxContent}</TabsContent>
    </Tabs>
  );
}
