"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { Icon } from "@/components/ui/icon";

const toasterTheme = (v: string): ToasterProps["theme"] =>
  v === "light" || v === "dark" ? v : "system";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={toasterTheme(theme)}
      className="toaster group"
      icons={{
        success: <Icon name="circle-check" className="size-4" />,
        info: <Icon name="info" className="size-4" />,
        warning: <Icon name="triangle-alert" className="size-4" />,
        error: <Icon name="octagon-x" className="size-4" />,
        loading: <Icon name="loader" className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
