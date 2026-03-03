import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassAuthCardProps {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  description?: ReactNode;
}

export function GlassAuthCard(props: GlassAuthCardProps) {
  return (
    <div
      className={cn(
        "border-border/60 bg-card/85 relative w-full max-w-md overflow-hidden rounded-3xl border p-8 backdrop-blur-xl animate-fade-in sm:p-10",
        props.className,
      )}
    >
      {(props.title || props.description) && (
        <div className="mb-8 space-y-2 text-center">
          {props.title && (
            <h1 className="text-foreground text-2xl font-semibold sm:text-3xl">
              {props.title}
            </h1>
          )}
          {props.description && (
            <p className="text-muted-foreground text-sm">
              {props.description}
            </p>
          )}
        </div>
      )}
      {props.children}
    </div>
  );
}
