/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import { env } from "@/lib/config/env";
import type { CSSProperties, ReactNode } from "react";
import { logoDataUri } from "../lib/cache";
import type { ThemeColors } from "../lib/types";
import { FONT_SANS } from "./typography";

const brandParts = env.appName!.split(/(?=[A-Z])/).filter(Boolean);
const brandTld = `.${new URL(env.apiUrl).hostname.split(".").pop()}`;

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
      <span style={{ color: props.c.text }}>{brandParts[0].toUpperCase()}</span>
      <span style={{ color: props.c.muted }}>
        {brandParts.slice(1).join("").toUpperCase()}
      </span>
      <span style={{ color: props.c.muted }}>{brandTld.toUpperCase()}</span>
    </Row>
  );
}

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
