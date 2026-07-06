import { Badge } from "@/components/ui/badge";
import type { ModelType } from "@/lib/api/pricing";
import type { VendorTheme } from "@/lib/config/vendor-themes";
import { cn } from "@/lib/utils";

const TYPE_CLASSES: Record<Exclude<ModelType, "text">, string> = {
  image:
    "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400",
  video:
    "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400",
  audio:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  embedding: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
};

type ModelTypeBadgeProps = {
  type: ModelType;
  theme: VendorTheme;
  className?: string;
};

export function ModelTypeBadge(props: ModelTypeBadgeProps) {
  const typeClass =
    props.type === "text"
      ? `${props.theme.tagBg} ${props.theme.tagBorder} ${props.theme.text}`
      : TYPE_CLASSES[props.type];
  return (
    <Badge
      variant="secondary"
      className={cn(
        "font-mono text-[10px] uppercase",
        typeClass,
        props.className,
      )}
    >
      {props.type}
    </Badge>
  );
}
