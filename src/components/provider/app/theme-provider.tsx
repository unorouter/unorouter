"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ComponentProps } from "react";

// TODO: remove when next-themes fixes React 19 script tag warning
// next-themes renders an inline <script> to prevent theme flicker.
// React 19 warns about script tags inside components, but the script
// runs correctly during SSR. Suppress the false-positive console error.
// See: https://github.com/shadcn-ui/ui/issues/10104
if (typeof window !== "undefined") {
  const original = console.error;
  console.error = (...args: Parameters<typeof console.error>) => {
    const msg = typeof args[0] === "string" ? args[0] : "";
    if (msg.includes("Encountered a script tag while rendering")) return;
    original.apply(console, args);
  };
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
