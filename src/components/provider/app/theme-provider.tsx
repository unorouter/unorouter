"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ComponentProps } from "react";

if (typeof window !== "undefined") {
  const original = console.error;
  console.error = (...args: Parameters<typeof console.error>) => {
    const msg = typeof args[0] === "string" ? args[0] : "";
    if (msg.includes("Encountered a script tag while rendering")) return;
    original.apply(console, args);
  };
  setTimeout(() => {
    console.error = original;
  }, 0);
}

export function ThemeProvider(
  props: ComponentProps<typeof NextThemesProvider>,
) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      {...props}
    >
      {props.children}
    </NextThemesProvider>
  );
}
