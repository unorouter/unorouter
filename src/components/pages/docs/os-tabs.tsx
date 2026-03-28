"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useOS } from "@/hooks/ui/use-os";
import type { OS } from "@/store/docs-store";
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
  const [os, setOs] = useOS();

  return (
    <Tabs
      value={os ?? "linux"}
      onValueChange={(v) => setOs(v as OS)}
      className="mt-8"
    >
      <TabsList variant="line">
        <TabsTrigger value="windows">
          <FaWindows className="size-3.5" />
          {props.labels.windows}
        </TabsTrigger>
        <TabsTrigger value="macos">
          <FaApple className="size-3.5" />
          {props.labels.macos}
        </TabsTrigger>
        <TabsTrigger value="linux">
          <FaLinux className="size-3.5" />
          {props.labels.linux}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="windows">{props.windowsContent}</TabsContent>
      <TabsContent value="macos">{props.macosContent}</TabsContent>
      <TabsContent value="linux">{props.linuxContent}</TabsContent>
    </Tabs>
  );
}
