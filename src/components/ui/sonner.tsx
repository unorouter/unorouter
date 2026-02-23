"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { LuCircleCheck, LuInfo, LuTriangleAlert, LuOctagonX, LuLoader } from "react-icons/lu"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <LuCircleCheck className="size-4" />
        ),
        info: (
          <LuInfo className="size-4" />
        ),
        warning: (
          <LuTriangleAlert className="size-4" />
        ),
        error: (
          <LuOctagonX className="size-4" />
        ),
        loading: (
          <LuLoader className="size-4 animate-spin" />
        ),
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
  )
}

export { Toaster }
