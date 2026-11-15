import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/lib/config/icon-map";

export function SidebarPageHeader(props: {
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={props.className}>
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
        <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
          {props.eyebrow}
        </span>
      </div>
      <h1 className="text-foreground mt-1 text-xl font-bold tracking-tight md:text-2xl">
        {props.title}
      </h1>
      {props.description && (
        <p className="text-muted-foreground mt-1 text-sm">
          {props.description}
        </p>
      )}
    </div>
  );
}

export function SectionTitle(props: { icon?: IconName; label: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {props.icon && (
        <Icon name={props.icon} className="text-muted-foreground h-4 w-4" />
      )}
      <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
        {props.label}
      </span>
    </div>
  );
}
