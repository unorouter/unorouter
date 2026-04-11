/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import type { CSSProperties, ReactNode } from "react";
import type { ThemeColors } from "./theme";
import { logoDataUri } from "./logo";

// ── Layout primitives ──────────────────────────────────────

/** Flexbox div (Satori requires display:flex on all divs) */
export function Row(props: { style?: CSSProperties; children?: ReactNode }) {
  return (
    <div style={{ display: "flex", ...props.style }}>{props.children}</div>
  );
}

export function Col(props: { style?: CSSProperties; children?: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", ...props.style }}>
      {props.children}
    </div>
  );
}

/** Full-size card wrapper with border and rounded corners */
export function Card(props: {
  c: ThemeColors;
  radius?: number;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <Row
      style={{
        width: "100%",
        height: "100%",
        borderRadius: props.radius ?? 12,
        backgroundColor: props.c.cardBg,
        border: `1px solid ${props.c.border}`,
        ...props.style,
      }}
    >
      {props.children}
    </Row>
  );
}

/** Vertical divider line */
export function Divider(props: {
  c: ThemeColors;
  margin?: string;
  opacity?: number;
}) {
  return (
    <Row
      style={{
        width: 1,
        backgroundColor: props.c.border,
        margin: props.margin ?? "0 24px",
        opacity: props.opacity ?? 1,
      }}
    />
  );
}

// ── Brand ──────────────────────────────────────────────────

/** Logo image */
export function Logo(props: { size?: number }) {
  return (
    <img
      src={logoDataUri()}
      width={props.size ?? 40}
      height={props.size ?? 40}
      style={{ borderRadius: 0 }}
    />
  );
}

/** Brand name: UNO (white) + ROUTER (muted) + .AI (accent) */
export function BrandName(props: { c: ThemeColors; size?: number }) {
  const fontSize = props.size ?? 16;
  return (
    <Row
      style={{
        fontFamily: "Space Grotesk",
        fontSize,
        fontWeight: 700,
        letterSpacing: 0.5,
      }}
    >
      <span style={{ color: props.c.text }}>UNO</span>
      <span style={{ color: props.c.muted }}>ROUTER</span>
      <span style={{ color: props.c.muted }}>.AI</span>
    </Row>
  );
}

/** Logo + Brand name in a row */
export function Brand(props: {
  c: ThemeColors;
  logoSize?: number;
  fontSize?: number;
  gap?: number;
}) {
  return (
    <Row style={{ alignItems: "center", gap: props.gap ?? 12 }}>
      <Logo size={props.logoSize} />
      <BrandName c={props.c} size={props.fontSize} />
    </Row>
  );
}
