"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ReactNode } from "react";

type CodeExamplesTabsProps = {
  curl: ReactNode;
  typescript: ReactNode;
  python: ReactNode;
};

export function CodeExamplesTabs(props: CodeExamplesTabsProps) {
  return (
    <Tabs defaultValue="curl">
      <TabsList variant="line">
        <TabsTrigger value="curl">curl</TabsTrigger>
        <TabsTrigger value="typescript">TypeScript</TabsTrigger>
        <TabsTrigger value="python">Python</TabsTrigger>
      </TabsList>
      <TabsContent value="curl">{props.curl}</TabsContent>
      <TabsContent value="typescript">{props.typescript}</TabsContent>
      <TabsContent value="python">{props.python}</TabsContent>
    </Tabs>
  );
}
