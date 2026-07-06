"use client";

import { cn } from "@/lib/utils";
import {
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
} from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";

const reasoningComponents = memoizeMarkdownComponents({
  h1: ({ className, ...props }) => (
    <h1
      className={cn("mb-2 text-sm font-semibold first:mt-0", className)}
      {...props}
    />
  ),
  h2: ({ className, ...props }) => (
    <h2
      className={cn("mt-2 mb-1 text-sm font-semibold first:mt-0", className)}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      className={cn("mt-2 mb-1 text-sm font-medium first:mt-0", className)}
      {...props}
    />
  ),
  p: ({ className, ...props }) => (
    <p
      className={cn("mt-1.5 leading-relaxed first:mt-0", className)}
      {...props}
    />
  ),
  ul: ({ className, ...props }) => (
    <ul
      className={cn("my-1.5 ml-4 list-disc space-y-0.5", className)}
      {...props}
    />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={cn("my-1.5 ml-4 list-decimal space-y-0.5", className)}
      {...props}
    />
  ),
  code: ({ className, ...props }) => (
    <code
      className={cn(
        "bg-muted/60 rounded px-1 py-0.5 font-mono text-[0.85em]",
        className,
      )}
      {...props}
    />
  ),
  pre: ({ className, ...props }) => (
    <pre
      className={cn(
        "bg-muted/60 my-1.5 overflow-x-auto rounded-md p-2 font-mono text-[0.85em]",
        className,
      )}
      {...props}
    />
  ),
  a: ({ className, ...props }) => (
    <a className={cn("underline underline-offset-2", className)} {...props} />
  ),
});

export const ReasoningMarkdown = () => (
  <MarkdownTextPrimitive
    remarkPlugins={[remarkGfm]}
    className="aui-md text-muted-foreground text-xs"
    components={reasoningComponents}
  />
);
