"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ComponentProps, useEffect } from "react";

// next-themes renders an inline <script> to prevent theme flicker.
// React 19 warns about script tags inside components, but the script
// runs correctly during SSR. Suppress the false-positive console error.
// See: https://github.com/shadcn-ui/ui/issues/10104
function useSuppressThemeScriptWarning() {
  useEffect(() => {
    const original = console.error;
    console.error = (...args: Parameters<typeof console.error>) => {
      const msg = typeof args[0] === "string" ? args[0] : "";
      if (msg.includes("Encountered a script tag while rendering")) return;
      original.apply(console, args);
    };
    return () => {
      console.error = original;
    };
  }, []);
}

export function ThemeProvider(
  props: ComponentProps<typeof NextThemesProvider>,
) {
  useSuppressThemeScriptWarning();
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
