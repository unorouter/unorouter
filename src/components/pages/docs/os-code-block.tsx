"use client";

import { ApiKeyCodeBlock } from "@/components/elements/code/api-key-code-block";
import { useDocs } from "@/hooks/ui/use-docs";
import type { OS } from "@/store/docs-store";

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

export function OSCodeBlock(props: OSCodeBlockProps) {
  const docs = useDocs();
  const variant = props.variants[docs.os ?? "windows"];

  return (
    <ApiKeyCodeBlock
      html={variant.html}
      code={variant.code}
      language={variant.language}
      placeholder={props.placeholder}
      label={variant.label}
      className={props.className}
    />
  );
}
