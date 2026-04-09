/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import type { CSSProperties, ReactNode } from "react";
import type { ThemeColors } from "../satori";
import { logoDataUri } from "../satori";

// ── Fonts ──────────────────────────────────────────────────

export const FONT_SANS = "Space Grotesk";
export const FONT_MONO = "JetBrains Mono";

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
      style={{ borderRadius: "50%" }}
    />
  );
}

/** Brand name: UNO (white) + ROUTER (muted) + .AI (accent) */
export function BrandName(props: { c: ThemeColors; size?: number }) {
  const fontSize = props.size ?? 16;
  return (
    <Row
      style={{
        fontFamily: FONT_SANS,
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

// ── Typography ─────────────────────────────────────────────

/** Large monospace number */
export function MonoValue(props: {
  value: string;
  c: ThemeColors;
  size?: number;
}) {
  return (
    <span
      style={{
        fontFamily: FONT_MONO,
        fontSize: props.size ?? 28,
        fontWeight: 700,
        color: props.c.text,
      }}
    >
      {props.value}
    </span>
  );
}

/** Small uppercase label */
export function Label(props: {
  text: string;
  c: ThemeColors;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        fontFamily: FONT_SANS,
        fontSize: props.size ?? 11,
        color: props.c.muted,
        letterSpacing: 1,
        textTransform: "uppercase",
        ...props.style,
      }}
    >
      {props.text}
    </span>
  );
}

/** Stat block: big number + label underneath */
export function Stat(props: {
  value: string;
  label: string;
  c: ThemeColors;
  size?: number;
}) {
  return (
    <Col>
      <MonoValue value={props.value} c={props.c} size={props.size} />
      <Label text={props.label} c={props.c} />
    </Col>
  );
}

// ── Decorative ─────────────────────────────────────────────

/** Small colored dot + text label */
export function Dot(props: {
  text: string;
  c: ThemeColors;
  dotSize?: number;
  fontSize?: number;
}) {
  return (
    <Row style={{ alignItems: "center", gap: 8, marginTop: 4 }}>
      <Row
        style={{
          width: props.dotSize ?? 5,
          height: props.dotSize ?? 5,
          borderRadius: "50%",
          backgroundColor: props.c.accent,
        }}
      />
      <span
        style={{
          fontFamily: FONT_SANS,
          fontSize: props.fontSize ?? 13,
          color: props.c.text,
        }}
      >
        {props.text}
      </span>
    </Row>
  );
}

/** SMIL pulsing green circle string (injected post-render) */
export function pulseDot(
  cx: number,
  cy: number,
  r: number,
  fill: string,
): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"><animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/></circle>`;
}
