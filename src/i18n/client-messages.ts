import { rec } from "@/lib/utils/base";

type Messages = Record<string, unknown>;

const CLIENT_STRIPPED_NAMESPACES = [
  "TERMS",
  "PRIVACY",
  "REFUND",
  "AUP",
  "WELL_KNOWN",
] as const;

const CLIENT_STRIPPED_SUBTREES = ["BLOG.POSTS"] as const;

// WEBMCP_TOOLS resolves these in a client effect, so stripping all of
// WELL_KNOWN (4096 bytes) threw MISSING_MESSAGE; keeping the two leaves costs 1114.
const CLIENT_KEPT_SUBTREES = [
  "WELL_KNOWN.MCP.TOOLS",
  "WELL_KNOWN.MCP.RESULTS",
] as const;

const CLIENT_DOCS_KEPT = [
  "SETUP",
  "SETUP_GUIDE",
  "CC_SWITCH",
  "GENERATE_API_KEY",
  "GENERATE_API_KEY_DESC",
  "COPY_LINK",
  "LINK_COPIED",
] as const;

const CLIENT_DOCS_GUIDE_LEAVES = [
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
  for (const subtree of CLIENT_STRIPPED_SUBTREES) {
    const segments = subtree.split(".");
    const leaf = segments.pop()!;
    let parent: Messages = pruned;
    let resolvable = true;
    for (const segment of segments) {
      const next = parent[segment];
      if (typeof next !== "object" || next === null) {
        resolvable = false;
        break;
      }
      const clone: Messages = { ...next };
      parent[segment] = clone;
      parent = clone;
    }
    if (resolvable) delete parent[leaf];
  }
  for (const ns of CLIENT_STRIPPED_NAMESPACES) {
    delete pruned[ns];
  }
  for (const subtree of CLIENT_KEPT_SUBTREES) {
    const segments = subtree.split(".");
    const leaf = segments.pop()!;
    let source: unknown = messages;
    let target: Messages = pruned;
    for (const segment of segments) {
      source = rec(source)?.[segment];
      const existing = rec(target[segment]);
      const clone: Messages = { ...existing };
      target[segment] = clone;
      target = clone;
    }
    const value = rec(source)?.[leaf];
    if (value !== undefined) target[leaf] = value;
  }
  return pruned;
}
