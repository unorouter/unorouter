import { Icon } from "@/components/ui/icon";
import type { StatusType } from "@/components/ui/status/status.types";
import { cn } from "@/lib/utils";

interface StatusIconProps extends React.ComponentProps<"div"> {
  status?: StatusType;
  variant?: "default" | "banner" | "component";
}

export function StatusIcon({
  className,
  variant = "default",
  status,
  ...props
}: StatusIconProps) {
  const sizeClasses =
    variant === "component"
      ? "size-[12.5px] [&>svg]:size-[9px]"
      : "size-7 [&>svg]:size-4";

  const statusClasses = (() => {
    switch (variant) {
      case "banner":
        return [
          "group-data-[status=success]/status-banner:bg-success",
          "group-data-[status=degraded]/status-banner:bg-warning",
          "group-data-[status=error]/status-banner:bg-destructive",
          "group-data-[status=info]/status-banner:bg-info",
        ];
      case "component":
        return [
          "group-data-[variant=success]/component:bg-success",
          "group-data-[variant=degraded]/component:bg-warning",
          "group-data-[variant=error]/component:bg-destructive",
          "group-data-[variant=info]/component:bg-info",
        ];
      case "default":
      default:
        return [
          "group-data-[variant=success]:bg-success",
          "group-data-[variant=degraded]:bg-warning",
          "group-data-[variant=error]:bg-destructive",
          "group-data-[variant=info]:bg-info",
        ];
    }
  })();

  const iconVisibilityClasses = (() => {
    switch (variant) {
      case "banner":
        return {
          success: "group-data-[status=success]/status-banner:block",
          degraded: "group-data-[status=degraded]/status-banner:block",
          error: "group-data-[status=error]/status-banner:block",
          info: "group-data-[status=info]/status-banner:block",
        };
      case "component":
        return {
          success: "group-data-[variant=success]/component:block",
          degraded: "group-data-[variant=degraded]/component:block",
          error: "group-data-[variant=error]/component:block",
          info: "group-data-[variant=info]/component:block",
        };
      case "default":
      default:
        return {
          success: "group-data-[variant=success]:block",
          degraded: "group-data-[variant=degraded]:block",
          error: "group-data-[variant=error]:block",
          info: "group-data-[variant=info]:block",
        };
    }
  })();

  return (
    <div
      data-slot="status-icon"
      className={cn(
        "bg-muted text-background flex items-center justify-center rounded-full",
        sizeClasses,
        ...statusClasses,
        className,
      )}
      {...props}
    >
      <Icon
        name="check"
        className={cn("hidden", iconVisibilityClasses.success)}
      />
      <Icon
        name="triangle-alert"
        className={cn("hidden", iconVisibilityClasses.degraded)}
      />
      <Icon
        name="alert-circle"
        className={cn("hidden", iconVisibilityClasses.error)}
      />
      <Icon
        name="wrench"
        className={cn("hidden", iconVisibilityClasses.info)}
      />
    </div>
  );
}
