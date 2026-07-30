import type { CSSProperties } from "react";
import { shapeArabic } from "../lib/arabic-shaper";
import type { ThemeColors } from "../lib/types";
import { Col, Row } from "./primitives";

export const FONT_SANS = "Space Grotesk";
export const FONT_MONO = "JetBrains Mono";

// Renders text as a normal Satori <span>, EXCEPT Arabic, which Satori cannot
// shape (see arabic-shaper.ts): that path pre-shapes with HarfBuzz and emits an
// <img> of the connected glyphs. `fontSize` + `color` must be concrete numbers/
// strings here so the shaper can size + paint the SVG identically to the span.
export function ShapedSpan(props: {
  text: string;
  fontSize: number;
  color: string;
  style?: CSSProperties;
}) {
  const shaped = shapeArabic(props.text, props.fontSize, props.color);
  if (shaped) {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img src={shaped.src} width={shaped.width} height={shaped.height} />;
  }
  return (
    <span style={{ fontSize: props.fontSize, color: props.color, ...props.style }}>
      {props.text}
    </span>
  );
}

export function MonoValue(props: {
  value: string;
  c: ThemeColors;
  size?: number;
  cipherMarker?: string;
}) {
  return (
    <span
      style={{
        fontFamily: FONT_MONO,
        fontSize: props.size ?? 28,
        fontWeight: 700,
        color: props.cipherMarker ?? props.c.text,
      }}
    >
      {props.value}
    </span>
  );
}

export function Label(props: {
  text: string;
  c: ThemeColors;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <ShapedSpan
      text={props.text}
      fontSize={props.size ?? 11}
      color={props.c.muted}
      style={{
        fontFamily: FONT_SANS,
        letterSpacing: 1,
        textTransform: "uppercase",
        ...props.style,
      }}
    />
  );
}

export function Stat(props: {
  value: string;
  label: string;
  c: ThemeColors;
  size?: number;
  labelSize?: number;
  cipherMarker?: string;
}) {
  return (
    <Col>
      <MonoValue
        value={props.value}
        c={props.c}
        size={props.size}
        cipherMarker={props.cipherMarker}
      />
      <Label text={props.label} c={props.c} size={props.labelSize} />
    </Col>
  );
}

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
