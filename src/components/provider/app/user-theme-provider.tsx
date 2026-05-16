"use client";

import { fontStackFromId } from "@/lib/config/theme-fonts";
import type { UserTheme } from "@/store/theme-store";
import { userThemeAtom } from "@/store/theme-store";
import { useAtomValue } from "jotai";
import { ReactNode, useMemo } from "react";

/**
 * Build the inline `<style>` content that overrides project-default CSS
 * variables with the user's chosen values. Returns an empty string when the
 * user has no overrides set so we don't ship a no-op style block.
 *
 * Same content is rendered SSR (from cookie) AND in the live atom, so the
 * inline style is hydration-stable.
 */
export function buildThemeCss(theme: UserTheme): string {
  const lines: string[] = [];
  const c = theme.colors ?? {};
  if (c.primary) lines.push(`--primary: ${c.primary};`);
  if (c.primaryForeground)
    lines.push(`--primary-foreground: ${c.primaryForeground};`);
  if (c.accent) lines.push(`--accent: ${c.accent};`);
  if (c.accentForeground)
    lines.push(`--accent-foreground: ${c.accentForeground};`);
  if (c.background) lines.push(`--background: ${c.background};`);
  if (c.foreground) lines.push(`--foreground: ${c.foreground};`);
  if (c.card) lines.push(`--card: ${c.card};`);
  if (c.cardForeground) lines.push(`--card-foreground: ${c.cardForeground};`);
  if (c.muted) lines.push(`--muted: ${c.muted};`);
  if (c.mutedForeground)
    lines.push(`--muted-foreground: ${c.mutedForeground};`);
  if (c.border) lines.push(`--border: ${c.border};`);
  if (c.ring) lines.push(`--ring: ${c.ring};`);
  if (c.destructive) lines.push(`--destructive: ${c.destructive};`);
  if (c.success) lines.push(`--success: ${c.success};`);
  if (c.warning) lines.push(`--warning: ${c.warning};`);
  if (c.info) lines.push(`--info: ${c.info};`);

  const sansStack = fontStackFromId(theme.fonts?.sans, "sans");
  if (sansStack) lines.push(`--font-sans: ${sansStack};`);
  const monoStack = fontStackFromId(theme.fonts?.mono, "mono");
  if (monoStack) lines.push(`--font-mono: ${monoStack};`);
  const displayStack = fontStackFromId(theme.fonts?.display, "display");
  if (displayStack) lines.push(`--font-display: ${displayStack};`);

  if (theme.fontSize) lines.push(`font-size: ${theme.fontSize}px;`);
  if (theme.lineHeight) lines.push(`line-height: ${theme.lineHeight};`);
  if (theme.letterSpacing != null)
    lines.push(`letter-spacing: ${theme.letterSpacing}em;`);
  if (theme.radius != null) lines.push(`--radius: ${theme.radius}rem;`);

  const t = theme.chatTokens ?? {};
  if (t.plain) lines.push(`--chat-plain: ${t.plain};`);
  if (t.italic) lines.push(`--chat-italic: ${t.italic};`);
  if (t.bold) lines.push(`--chat-bold: ${t.bold};`);
  if (t.code) lines.push(`--chat-code: ${t.code};`);
  if (t.quote) lines.push(`--chat-quote: ${t.quote};`);

  if (lines.length === 0) return "";
  return `:root{${lines.join("")}}`;
}

/**
 * Inject the user's runtime theme overrides as a single inline `<style>`
 * tag. Lives inside the React tree (after JotaiProvider hydrates the atom
 * from the cookie), so the style block updates synchronously when the user
 * tweaks a value. SSR cookie hydration is handled by jotaiCookieStorage
 * upstream, so first paint already matches the saved theme.
 */
export function UserThemeProvider(props: { children: ReactNode }) {
  const theme = useAtomValue(userThemeAtom);
  const css = useMemo(() => buildThemeCss(theme), [theme]);
  return (
    <>
      {css ? (
        <style id="user-theme" dangerouslySetInnerHTML={{ __html: css }} />
      ) : null}
      {props.children}
    </>
  );
}
