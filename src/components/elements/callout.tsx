import { cn } from "@/lib/utils";
import { LuInfo, LuTriangleAlert, LuCircleX } from "react-icons/lu";

type CalloutType = "info" | "warn" | "error";

const calloutStyles: Record<
  CalloutType,
  { border: string; bg: string; icon: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  info: {
    border: "border-blue-500/40",
    bg: "bg-blue-500/5",
    icon: "text-blue-500",
    Icon: LuInfo,
  },
  warn: {
    border: "border-amber-500/40",
    bg: "bg-amber-500/5",
    icon: "text-amber-500",
    Icon: LuTriangleAlert,
  },
  error: {
    border: "border-red-500/40",
    bg: "bg-red-500/5",
    icon: "text-red-500",
    Icon: LuCircleX,
  },
};

interface CalloutProps {
  type?: CalloutType;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Callout(props: CalloutProps) {
  const style = calloutStyles[props.type ?? "info"];

  return (
    <div
      className={cn(
        "my-4 rounded-lg border-l-4 p-4",
        style.border,
        style.bg,
        props.className,
      )}
    >
      <div className="flex items-center gap-2">
        <style.Icon className={cn("size-4 shrink-0", style.icon)} />
        <span className="text-sm font-semibold">{props.title}</span>
      </div>
      <div className="text-muted-foreground mt-2 text-sm [&_pre]:my-2 [&_code]:text-xs">
        {props.children}
      </div>
    </div>
  );
}
