// Per-model request-body rewrites the ai-sdk openai-compatible provider can't express.
// Pure + isomorphic: a fetch wrapper rewrites the JSON body before it leaves. Shared by the
// server getProvider and the client custom-provider transport.

export type BodyMutations = {
  // Anthropic prompt caching: cache_control markers on system + last user.
  injectCacheControl?: boolean;
  // DeepSeek prefix-completion: trailing assistant gets prefix: true.
  deepSeekPrefix?: boolean;
  // DeepSeek thinking toggle; enabled mode rejects sampling params.
  deepSeekThinking?: { enabled: boolean; effort: string };
  // Echo the previous turn's reasoning on the trailing assistant message.
  deepSeekReasoningContent?: string;
  // Claude adaptive thinking + output effort.
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

type WireMessage = { role: string; content: unknown } & Record<string, unknown>;
type WireBody = { messages?: WireMessage[] } & Record<string, unknown>;

// Mark system prompt + last user message cache_control: ephemeral so the stable RP prefix caches upstream.
function applyCacheControl(body: WireBody) {
  if (!Array.isArray(body.messages) || body.messages.length === 0) return;
  const mark = (content: unknown): unknown => {
    // String content -> wrap into a single text block carrying the marker.
    if (typeof content === "string") {
      return [
        { type: "text", text: content, cache_control: { type: "ephemeral" } },
      ];
    }
    // Block array -> mark the last block.
    if (Array.isArray(content) && content.length > 0) {
      const last = content[content.length - 1];
      if (last && typeof last === "object") {
        (last as Record<string, unknown>).cache_control = {
          type: "ephemeral",
        };
      }
      return content;
    }
    return content;
  };
  const sys = body.messages.find((m) => m.role === "system");
  if (sys) sys.content = mark(sys.content);
  // Last user message anchors the cache breakpoint before generation.
  for (let i = body.messages.length - 1; i >= 0; i--) {
    if (body.messages[i].role === "user") {
      body.messages[i].content = mark(body.messages[i].content);
      break;
    }
  }
}

// Best-effort: parse failure forwards the request untouched.
export function makeBodyMutationFetch(opts: BodyMutations): typeof fetch {
  return async (input, init) => {
    try {
      if (init?.body && typeof init.body === "string") {
        const body = JSON.parse(init.body) as WireBody;
        if (opts.injectCacheControl) applyCacheControl(body);
        const msgs = Array.isArray(body.messages) ? body.messages : [];
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
            // Risu: thinking mode rejects sampling params.
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
    } catch {
      // fall through with the original init
    }
    return fetch(input, init);
  };
}
