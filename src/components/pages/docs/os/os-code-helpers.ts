import { highlightCode } from "@/components/elements/code/code-block";
import { OS } from "@/lib/types/enums";
import type { OSCodeVariant } from "./os-code-block";

type VariantInput = {
  code: string;
  language: string;
  label?: string;
};

export async function buildOSVariants(
  variants: Record<OS, VariantInput>,
): Promise<Record<OS, OSCodeVariant>> {
  const [windows, macos, linux] = await Promise.all([
    highlightCode(variants.windows.code, variants.windows.language),
    highlightCode(variants.macos.code, variants.macos.language),
    highlightCode(variants.linux.code, variants.linux.language),
  ]);

  return {
    windows: { ...variants.windows, html: windows },
    macos: { ...variants.macos, html: macos },
    linux: { ...variants.linux, html: linux },
  };
}

export function envVarCode(vars: Record<string, string>, os: OS): string {
  if (os === OS.WINDOWS) {
    return Object.entries(vars)
      .map(([k, v]) => `$env:${k}="${v}"`)
      .join("\n");
  }
  return Object.entries(vars)
    .map(([k, v]) => `export ${k}="${v}"`)
    .join("\n");
}
