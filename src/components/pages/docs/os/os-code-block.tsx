"use client";

import { ApiKeyCodeBlock } from "@/components/elements/code/api-key-code-block";
import { Icon } from "@/components/ui/icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiKey } from "@/hooks/ui/use-api-key";
import type { IconName } from "@/lib/config/icon-map";
import { isOS, OS } from "@/lib/types/enums";

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

const osTabs: { value: OS; icon: IconName; label: string }[] = [
  { value: OS.WINDOWS, icon: "brand-windows", label: "Windows" },
  { value: OS.MACOS, icon: "brand-apple", label: "macOS" },
  { value: OS.LINUX, icon: "brand-linux", label: "Linux" },
];

export function OSCodeBlock(props: OSCodeBlockProps) {
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
