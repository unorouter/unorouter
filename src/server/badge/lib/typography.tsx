import type { CSSProperties } from "react";
import { Col, Row } from "./primitives";
import type { ThemeColors } from "./theme";

export const FONT_SANS = "Space Grotesk";
export const FONT_MONO = "JetBrains Mono";

/** Large monospace number. When `cipherMarker` is set, renders with that fill
 *  so the cipher post-processor can locate and replace the path. */
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
