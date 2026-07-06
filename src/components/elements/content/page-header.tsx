import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/lib/config/icon-map";
import { cn } from "@/lib/utils";
import type { ComponentType, CSSProperties } from "react";

interface PageHeaderProps {
  badge: string;
  badgeIcon?: IconName;
  badgeIconComponent?: ComponentType<{
    className?: string;
    style?: CSSProperties;
  }>;
  title: string;
  subtitle: string;
  centered?: boolean;
  color?: string;
  className?: string;
}

export function PageHeader(props: PageHeaderProps) {
  const BadgeCmp = props.badgeIconComponent;
  const color = props.color ?? "currentColor";

  return (
    <div className={cn(props.centered && "text-center", props.className)}>
      <div
        className="mb-6 inline-flex items-center gap-2 rounded-sm border px-3 py-1.5"
        style={{
          borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
          backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
        }}
      >
        {props.badgeIcon && (
          <Icon name={props.badgeIcon} className="size-3" style={{ color }} />
        )}
        {BadgeCmp && <BadgeCmp className="size-3" style={{ color }} />}
        <span
          className="font-mono text-[10px] tracking-[0.2em] uppercase"
          style={{ color }}
        >
          {props.badge}
        </span>
      </div>
      <h1 className="text-4xl font-bold tracking-tighter">{props.title}</h1>
      <p className="text-muted-foreground mt-3 font-mono text-sm leading-relaxed">
        {props.subtitle}
      </p>
    </div>
  );
}
