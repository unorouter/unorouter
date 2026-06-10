import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/lib/config/icon-map";
import Image from "next/image";
import CherryStudio from "@lobehub/icons/es/CherryStudio";
import ClaudeCode from "@lobehub/icons/es/ClaudeCode";
import Cline from "@lobehub/icons/es/Cline";
import Codex from "@lobehub/icons/es/Codex";
import Gemini from "@lobehub/icons/es/Gemini";
import HermesAgent from "@lobehub/icons/es/HermesAgent";
import KiloCode from "@lobehub/icons/es/KiloCode";
import LobeHub from "@lobehub/icons/es/LobeHub";
import OpenClaw from "@lobehub/icons/es/OpenClaw";
import OpenCode from "@lobehub/icons/es/OpenCode";
import OpenWebUI from "@lobehub/icons/es/OpenWebUI";
import RooCode from "@lobehub/icons/es/RooCode";
import SillyTavern from "@lobehub/icons/es/SillyTavern";
import type { ComponentType } from "react";
import type { IntegrationIconKey } from "./integrations";

type LobeIcon = ComponentType<{ className?: string; size?: number }>;

/** lucide names for tools without a lobehub brand icon or a logo file. */
const ICON_NAMES: Partial<Record<IntegrationIconKey, IconName>> = {
  "cc-switch": "arrow-left-right",
  "janitor-ai": "broom",
  risuai: "fox",
  chub: "heart",
};

/** lobehub brand components, keyed by iconKey. */
const ICON_COMPONENTS: Partial<Record<IntegrationIconKey, LobeIcon>> = {
  "claude-code": ClaudeCode.Color,
  codex: Codex.Color,
  gemini: Gemini.Color,
  opencode: OpenCode,
  "kilo-code": KiloCode,
  cline: Cline,
  "roo-code": RooCode,
  "open-webui": OpenWebUI,
  lobechat: LobeHub.Color,
  "cherry-studio": CherryStudio.Color,
  sillytavern: SillyTavern.Color,
  openclaw: OpenClaw.Color,
  hermes: HermesAgent,
};

// Icon source order: self-hosted logoSrc, lucide name, lobehub brand component.
// Shared by docs index cards and the guide page hero.
export function GuideIcon(props: {
  iconKey: IntegrationIconKey;
  logoSrc?: string;
  logoBg?: boolean;
  /** Tailwind text-color class for the lucide/mono fallback. */
  accentClass?: string;
  /** Pixel size for img/lobehub/lucide. Default 48. */
  size?: number;
}) {
  const size = props.size ?? 48;
  const accent = props.accentClass ?? "";

  if (props.logoSrc) {
    if (props.logoBg) {
      return (
        <div
          className="relative flex items-center justify-center rounded-md bg-white p-1.5"
          style={{ width: size, height: size }}
        >
          <Image
            src={props.logoSrc}
            alt={props.iconKey}
            width={size - 12}
            height={size - 12}
            unoptimized
            className="h-full w-full object-contain"
          />
        </div>
      );
    }
    return (
      <Image
        src={props.logoSrc}
        alt={props.iconKey}
        width={size}
        height={size}
        unoptimized
        className="relative object-contain"
        style={{ width: size, height: size }}
      />
    );
  }

  const iconName = ICON_NAMES[props.iconKey];
  if (iconName) {
    return (
      <Icon name={iconName} size={size} className={`relative ${accent}`} />
    );
  }

  const IconComponent = ICON_COMPONENTS[props.iconKey];
  if (IconComponent) {
    return <IconComponent size={size} className={`relative ${accent}`} />;
  }

  return null;
}
