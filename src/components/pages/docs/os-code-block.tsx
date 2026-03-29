"use client";

import { ApiKeyCodeBlock } from "@/components/elements/code/api-key-code-block";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useDocs } from "@/hooks/ui/use-docs";
import type { OS } from "@/store/docs-store";
import { FaApple, FaLinux, FaWindows } from "react-icons/fa";

export type OSCodeVariant = {
  code: string;
  html: string;
  language: string;
  label?: string;
};

type OSCodeBlockProps = {
  variants: Record<OS, OSCodeVariant>;
  placeholder: string;
  className?: string;
};

const osTabs = [
  { value: "windows" as const, icon: FaWindows, label: "Windows" },
  { value: "macos" as const, icon: FaApple, label: "macOS" },
  { value: "linux" as const, icon: FaLinux, label: "Linux" },
];

export function OSCodeBlock(props: OSCodeBlockProps) {
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

      {osTabs.map((tab) => {
        const variant = props.variants[tab.value];
        return (
          <TabsContent key={tab.value} value={tab.value}>
            <ApiKeyCodeBlock
              html={variant.html}
              code={variant.code}
              language={variant.language}
              placeholder={props.placeholder}
              label={variant.label}
              className={props.className}
            />
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
