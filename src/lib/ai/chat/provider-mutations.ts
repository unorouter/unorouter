import { isRecord, rec, recArr } from "@/lib/utils/base";

export type BodyMutations = {
  injectCacheControl?: boolean;
  deepSeekPrefix?: boolean;
  deepSeekThinking?: { enabled: boolean; effort: string };
  deepSeekReasoningContent?: string;
  claudeAdaptive?: { effort: "high" | "xhigh" };
};

export function hasBodyMutation(opts?: BodyMutations): boolean {
  return Boolean(
    opts &&
    (opts.injectCacheControl ||
      opts.deepSeekPrefix ||
      opts.deepSeekThinking ||
      opts.deepSeekReasoningContent ||
      opts.claudeAdaptive),
  );
}

function applyCacheControl(body: Record<string, unknown>) {
  const messages = recArr(body.messages);
  if (messages.length === 0) return;
  const mark = (content: unknown): unknown => {
    if (typeof content === "string") {
      return [
        { type: "text", text: content, cache_control: { type: "ephemeral" } },
      ];
    }
    if (Array.isArray(content) && content.length > 0) {
      const last: unknown = content[content.length - 1];
      if (isRecord(last)) {
        last.cache_control = { type: "ephemeral" };
      }
      return content;
    }
    return content;
  };
  const sys = messages.find((m) => m.role === "system");
  if (sys) sys.content = mark(sys.content);
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      messages[i].content = mark(messages[i].content);
      break;
    }
  }
}

// Firefox honors a user-agent set on fetch; the SDK's "ai-sdk/..." value then
// replaces the browser's and trips the edge's browser-only rule on /api/ai/.
function withoutUserAgent(
  init: RequestInit | undefined,
): RequestInit | undefined {
  if (typeof window === "undefined" || !init?.headers) return init;
  const headers = new Headers(init.headers);
  headers.delete("user-agent");
  return { ...init, headers };
}

export function makeUpstreamFetch(opts?: BodyMutations): typeof fetch {
  return async (input, init) => {
    init = withoutUserAgent(init);
    if (!opts || !hasBodyMutation(opts)) return fetch(input, init);
    try {
      if (init?.body && typeof init.body === "string") {
        const body = rec(JSON.parse(init.body));
        if (!body) return fetch(input, init);
        if (opts.injectCacheControl) applyCacheControl(body);
        const msgs = recArr(body.messages);
        const last = msgs[msgs.length - 1];
        if (opts.deepSeekPrefix && last?.role === "assistant") {
          last.prefix = true;
        }
        if (opts.deepSeekReasoningContent && last?.role === "assistant") {
          last.reasoning_content = opts.deepSeekReasoningContent;
        }
        if (opts.deepSeekThinking) {
          body.thinking = {
            type: opts.deepSeekThinking.enabled ? "enabled" : "disabled",
            reasoning_effort: opts.deepSeekThinking.effort,
          };
          delete body.reasoning_effort;
          if (opts.deepSeekThinking.enabled) {
            delete body.temperature;
            delete body.top_p;
            delete body.frequency_penalty;
            delete body.presence_penalty;
          }
        }
        if (opts.claudeAdaptive) {
          body.thinking = { type: "adaptive", display: "summarized" };
          body.output_config = { effort: opts.claudeAdaptive.effort };
          delete body.reasoning_effort;
        }
        init = { ...init, body: JSON.stringify(body) };
      }
    } catch {}
    return fetch(input, init);
  };
}
