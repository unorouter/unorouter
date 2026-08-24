import {
  RESULT_CAPABILITY,
  type AgentContext,
  type AgentDefinition,
  type AgentPhase,
  type AgentResult,
  type AgentRuntime,
} from "./types";

export type ResolvedAgent = {
  phase: AgentPhase;
  enabled: (ctx: AgentContext) => boolean;
  run: (ctx: AgentContext, runtime: AgentRuntime) => Promise<AgentResult>;
};

export function resolveAgent<S>(
  def: AgentDefinition<S>,
  settings: S,
): ResolvedAgent {
  return {
    phase: def.phase,
    enabled: (ctx) => def.enabled(ctx, settings),
    run: (ctx, runtime) =>
      def.run(ctx, runtime, settings).then((r) => gate(def, r)),
  };
}

function gate<S>(def: AgentDefinition<S>, result: AgentResult): AgentResult {
  const needed = RESULT_CAPABILITY[result.type];
  if (needed && !def.capabilities.includes(needed)) return { type: "noop" };
  return result;
}

async function executePhase(
  agents: ResolvedAgent[],
  ctx: AgentContext,
  runtime: AgentRuntime,
): Promise<AgentResult[]> {
  const active = agents.filter((a) => a.phase === ctx.phase && a.enabled(ctx));
  if (active.length === 0) return [];
  const settled = await Promise.allSettled(
    active.map((a) => a.run(ctx, runtime)),
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
