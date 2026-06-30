// 3-phase runner. Agents in a phase run concurrently; a throwing agent yields noop (best-effort, matches
// the existing memory/trigger posture). Each agent owns its own LLM call (Uno races free models, so there
// is no provider+model batching to do, unlike Marinara).

import {
  RESULT_CAPABILITY,
  type AgentContext,
  type AgentDefinition,
  type AgentResult,
  type AgentRuntime,
  type AgentSettings,
} from "./types";

export type ResolvedAgent = { def: AgentDefinition; settings: AgentSettings };

// Drop a result the agent isn't allowed to produce to noop (it can't have declared the capability).
function gate(def: AgentDefinition, result: AgentResult): AgentResult {
  const needed = RESULT_CAPABILITY[result.type];
  if (needed && !def.capabilities.includes(needed)) return { type: "noop" };
  return result;
}

async function executePhase(
  agents: ResolvedAgent[],
  ctx: AgentContext,
  runtime: AgentRuntime,
): Promise<AgentResult[]> {
  const active = agents.filter(
    (a) => a.def.phase === ctx.phase && a.def.enabled(ctx, a.settings),
  );
  if (active.length === 0) return [];
  const settled = await Promise.allSettled(
    active.map((a) =>
      a.def.run(ctx, runtime, a.settings).then((r) => gate(a.def, r)),
    ),
  );
  return settled.map((s) =>
    s.status === "fulfilled" ? s.value : { type: "noop" as const },
  );
}

export function createAgentPipeline(
  agents: ResolvedAgent[],
  baseContext: Omit<AgentContext, "phase" | "mainResponse">,
  runtime: AgentRuntime,
) {
  return {
    preGenerate: () =>
      executePhase(
        agents,
        { ...baseContext, phase: "pre_generation", mainResponse: null },
        runtime,
      ),
    postGenerate: (mainResponse: string) =>
      executePhase(
        agents,
        { ...baseContext, phase: "post_processing", mainResponse },
        runtime,
      ),
  };
}
