import type { AgentDefinition } from "./types";
import { summaryAgent } from "./builtin/summary/agent";
import { illustratorAgent } from "./builtin/illustrator/agent";

export const BUILTIN_AGENTS: AgentDefinition[] = [
  summaryAgent,
  illustratorAgent,
];
