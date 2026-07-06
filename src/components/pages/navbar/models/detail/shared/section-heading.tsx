import { getVendorTheme } from "@/lib/config/vendor-themes";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Theme = ReturnType<typeof getVendorTheme>;

const HEADING = "font-mono text-[10px] tracking-widest uppercase";

// Shared uppercase mono section label used across every model-detail section.
// `action` renders a right-aligned slot (period tabs); `icon` a leading glyph.
export function SectionHeading(props: {
  theme: Theme;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  const heading = (
    <h2 className={cn(HEADING, props.theme.text)}>{props.children}</h2>
  );

  if (props.action) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2",
          props.className ?? "mb-3",
        )}
      >
        {heading}
        {props.action}
      </div>
    );
  }

  if (props.icon) {
    return (
      <div className={cn("flex items-center gap-2", props.className ?? "mb-3")}>
        {props.icon}
        {heading}
      </div>
    );
  }

  return (
    <h2 className={cn(HEADING, props.className ?? "mb-3", props.theme.text)}>
      {props.children}
    </h2>
  );
}
