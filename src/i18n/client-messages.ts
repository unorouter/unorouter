import { rec } from "@/lib/utils/base";

type Messages = Record<string, unknown>;

const CLIENT_STRIPPED_NAMESPACES = [
  "TERMS",
  "PRIVACY",
  "REFUND",
  "AUP",
  "IMPRESSUM",
  "WELL_KNOWN",
] as const;

const CLIENT_DOCS_KEPT = [
  "SETUP",
  "SETUP_GUIDE",
  "CC_SWITCH",
  "GENERATE_API_KEY",
  "GENERATE_API_KEY_DESC",
  "COPY_LINK",
  "LINK_COPIED",
  "OS",
] as const;

const CLIENT_DOCS_GUIDE_LEAVES = [
  "BADGE",
  "TITLE",
  "SUBTITLE",
  "CTA_SIGNUP",
  "CTA_DASHBOARD",
] as const;

const CLIENT_DOCS_CHAT_KEPT = ["COMMON", "INDEX"] as const;

const CLIENT_DOCS_PLATFORM_KEPT = ["COMMON", "INDEX"] as const;

function pruneDocsNamespace(
  source: unknown,
  keptSubtrees: readonly string[],
): Messages {
  const pruned: Messages = {};
  if (typeof source !== "object" || source === null) return pruned;
  const docs: Record<string, unknown> = { ...source };
  for (const key of keptSubtrees) {
    if (docs[key] !== undefined) pruned[key] = docs[key];
  }
  for (const [key, value] of Object.entries(docs)) {
    if (pruned[key] !== undefined) continue;
    const guide = rec(value);
    if (!guide || typeof guide.TITLE !== "string") continue;
    const leaves: Messages = {};
    for (const leaf of CLIENT_DOCS_GUIDE_LEAVES) {
      if (guide[leaf] !== undefined) leaves[leaf] = guide[leaf];
    }
    pruned[key] = leaves;
  }
  return pruned;
}

export function pruneClientMessages(messages: Messages): Messages {
  const prunedDocs = pruneDocsNamespace(messages.DOCS, CLIENT_DOCS_KEPT);
  const prunedDocsChat = pruneDocsNamespace(
    messages.DOCS_CHAT,
    CLIENT_DOCS_CHAT_KEPT,
  );
  const prunedDocsPlatform = pruneDocsNamespace(
    messages.DOCS_PLATFORM,
    CLIENT_DOCS_PLATFORM_KEPT,
  );

  const pruned: Messages = {
    ...messages,
    DOCS: prunedDocs,
    DOCS_CHAT: prunedDocsChat,
    DOCS_PLATFORM: prunedDocsPlatform,
  };
  for (const ns of CLIENT_STRIPPED_NAMESPACES) {
    delete pruned[ns];
  }
  const blog = rec(messages.BLOG);
  if (blog)
    pruned.BLOG = Object.fromEntries(
      Object.entries(blog).filter((entry) => entry[0] !== "POSTS"),
    );
  // WEBMCP_TOOLS resolves these in a client effect, so stripping all of
  // WELL_KNOWN (4096 bytes) threw MISSING_MESSAGE; keeping the two leaves costs 1114.
  const mcp = rec(rec(messages.WELL_KNOWN)?.MCP);
  if (mcp)
    pruned.WELL_KNOWN = { MCP: { TOOLS: mcp.TOOLS, RESULTS: mcp.RESULTS } };
  return pruned;
}
