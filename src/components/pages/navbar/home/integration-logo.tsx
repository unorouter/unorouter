import type { IntegrationEntry } from "@/components/pages/navbar/home/integrations";

type IntegrationLogoProps = {
  integration: IntegrationEntry;
  /** Outer box size in px (square). Inner image is sized for visual parity. */
  size: number;
  /** Shape of the white background box used when `logoBg` is set. */
  bgShape?: "rounded" | "circle";
  /** Extra classes for the outer element (img, bg-box, or icon). */
  className?: string;
};

export function IntegrationLogo(props: IntegrationLogoProps) {
  const integration = props.integration;
  const size = props.size;
  const cls = props.className ?? "";

  if (integration.logoSrc) {
    if (integration.logoBg) {
      const innerSize = Math.round(size * 0.75);
      const shapeCls =
        props.bgShape === "circle" ? "rounded-full" : "rounded-md";
      return (
        <div
          className={`flex items-center justify-center ${shapeCls} bg-white p-1 ${cls}`}
          style={{ width: size, height: size }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={integration.logoSrc}
            alt={integration.badge}
            width={innerSize}
            height={innerSize}
            className="h-full w-full object-contain"
          />
        </div>
      );
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={integration.logoSrc}
        alt={integration.badge}
        width={size}
        height={size}
        className={`object-contain ${cls}`.trim()}
        style={{ width: size, height: size }}
      />
    );
  }

  const IconCmp = integration.icon;
  return IconCmp ? <IconCmp size={size} className={cls} /> : null;
}
