import { resolveAdapter } from "@/lib/ai/providers/registry";
import type { ModelRoleFlags } from "@/lib/ai/providers/types";

export type { ModelRoleFlags };

export function getModelRoleFlags(modelName: string): ModelRoleFlags {
  return resolveAdapter(modelName).roleFlags;
}
