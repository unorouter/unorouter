// Built-in agent definitions. New agent = add builtin/<id>/agent.ts + one line here.

import type { AgentDefinition } from "./types";
import { summaryAgent } from "./builtin/summary/agent";
import { illustratorAgent } from "./builtin/illustrator/agent";

export const BUILTIN_AGENTS: AgentDefinition[] = [
  summaryAgent,
  illustratorAgent,
];
