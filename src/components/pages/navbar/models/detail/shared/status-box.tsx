import type { ReactNode } from "react";

// Centered bordered box for loading / empty states in the detail tab sections.
export function StatusBox(props: { children: ReactNode }) {
  return (
    <div className="text-muted-foreground border-border rounded-md border p-4 text-center text-sm">
      {props.children}
    </div>
  );
}
