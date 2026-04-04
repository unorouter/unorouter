"use client";

import type { SyntaxHighlighterProps } from "@assistant-ui/react-markdown";
import ShikiHighlighter from "react-shiki";
import { cn } from "@/lib/utils";
import type { FC } from "react";

export const ShikiSyntaxHighlighter: FC<
  Omit<SyntaxHighlighterProps, "node">
> = ({ code, language, components: _components, ...props }) => {
  return (
    <ShikiHighlighter
      {...props}
      language={language}
      theme={{ dark: "vitesse-dark", light: "vitesse-light" }}
      addDefaultStyles={false}
      showLanguage={false}
      defaultColor="light-dark()"
      className={cn(
        "[&_pre]:border-border/50 [&_pre]:bg-muted/30 [&_pre]:overflow-x-auto [&_pre]:rounded-t-none [&_pre]:rounded-b-lg [&_pre]:border [&_pre]:border-t-0 [&_pre]:p-3 [&_pre]:text-xs [&_pre]:leading-relaxed",
      )}
    >
      {code.trim()}
    </ShikiHighlighter>
  );
};
