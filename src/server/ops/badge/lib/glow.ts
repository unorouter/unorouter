const GLOW_BASE = "#070409";

export const RAINBOW =
  "linear-gradient(90deg, #ff2d55 0%, #ff8a00 18%, #ffd60a 34%, #34c759 52%, #00c7be 66%, #0a84ff 82%, #bf5af2 100%)";

function spotSvg(
  id: string,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  a: string,
  b: string,
  W: number,
  H: number,
  intensity: number,
): { def: string; shape: string } {
  const ccx = (cx / 100) * W;
  const ccy = (cy / 100) * H;
  const rrx = (rx / 100) * W;
  const rry = (ry / 100) * H;
  const x0 = (ccx - rrx).toFixed(1);
  const x1 = (ccx + rrx).toFixed(1);
  const o0 = (0.6 * intensity).toFixed(2);
  const o1 = (0.26 * intensity).toFixed(2);
  const def =
    `<linearGradient id="${id}h" gradientUnits="userSpaceOnUse" x1="${x0}" y1="0" x2="${x1}" y2="0">` +
    `<stop offset="0%" stop-color="${a}"/>` +
    `<stop offset="100%" stop-color="${b}"/>` +
    `</linearGradient>` +
    `<radialGradient id="${id}m" gradientUnits="userSpaceOnUse" ` +
    `cx="${ccx.toFixed(1)}" cy="${ccy.toFixed(1)}" r="${rrx.toFixed(1)}">` +
    `<stop offset="0%" stop-color="#fff" stop-opacity="${o0}"/>` +
    `<stop offset="40%" stop-color="#fff" stop-opacity="${o1}"/>` +
    `<stop offset="78%" stop-color="#fff" stop-opacity="0"/>` +
    `</radialGradient>` +
    `<mask id="${id}k">` +
    `<ellipse cx="${ccx.toFixed(1)}" cy="${ccy.toFixed(1)}" rx="${rrx.toFixed(1)}" ry="${rry.toFixed(1)}" fill="url(#${id}m)"/>` +
    `</mask>`;
  const shape = `<rect width="${W}" height="${H}" fill="url(#${id}h)" mask="url(#${id}k)"/>`;
  return { def, shape };
}

export function bgSvg(
  W: number,
  H: number,
  focusX: number,
  intensity: number,
  layout: "strip" | "grid",
): string {
  const hRx = ((H * 1.1) / W) * 100;
  const spots =
    layout === "strip"
      ? [
          spotSvg(
            "sA",
            focusX - 16,
            70,
            hRx,
            150,
            "#ff5e7a",
            "#ff9a3d",
            W,
            H,
            intensity,
          ),
          spotSvg(
            "sB",
            focusX - 2,
            36,
            hRx,
            150,
            "#ffd23d",
            "#46d36a",
            W,
            H,
            intensity,
          ),
          spotSvg(
            "sC",
            focusX + 14,
            64,
            hRx,
            150,
            "#27b6e6",
            "#9b5cf0",
            W,
            H,
            intensity,
          ),
        ]
      : [
          spotSvg("sA", 64, 116, 38, 74, "#ff5e7a", "#ff9a3d", W, H, intensity), // red -> orange (bottom)
          spotSvg(
            "sB",
            focusX - 8,
            54,
            34,
            78,
            "#ffd23d",
            "#46d36a",
            W,
            H,
            intensity,
          ), // yellow -> green (icons)
          spotSvg("sC", 100, 34, 34, 86, "#27b6e6", "#9b5cf0", W, H, intensity), // blue -> violet (right)
        ];
  const defs = spots.map((s) => s.def).join("");
  const shapes = spots.map((s) => s.shape).join("");
  return (
    `<defs>${defs}</defs>` +
    `<rect width="${W}" height="${H}" fill="${GLOW_BASE}"/>` +
    shapes
  );
}
