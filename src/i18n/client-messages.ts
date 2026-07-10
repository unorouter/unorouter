type Messages = Record<string, unknown>;

export const CLIENT_STRIPPED_NAMESPACES = [
  "TERMS",
  "PRIVACY",
  "REFUND",
  "AUP",
  "WELL_KNOWN",
] as const;

export const CLIENT_STRIPPED_SUBTREES = ["BLOG.POSTS"] as const;

export const CLIENT_DOCS_KEPT = [
  "SETUP",
  "SETUP_GUIDE",
  "CC_SWITCH",
  "GENERATE_API_KEY",
  "GENERATE_API_KEY_DESC",
] as const;

export const CLIENT_DOCS_GUIDE_LEAVES = [
  "TITLE",
  "SUBTITLE",
  "CTA_SIGNUP",
  "CTA_DASHBOARD",
] as const;

export const CLIENT_DOCS_CHAT_KEPT = ["COMMON", "INDEX"] as const;

export const CLIENT_DOCS_PLATFORM_KEPT = ["COMMON", "INDEX"] as const;

function pruneDocsNamespace(
  docs: Messages,
  keptSubtrees: readonly string[],
): Messages {
  const pruned: Messages = {};
  for (const key of keptSubtrees) {
    if (docs[key] !== undefined) pruned[key] = docs[key];
  }
  for (const [key, value] of Object.entries(docs)) {
    if (pruned[key] !== undefined) continue;
    if (typeof value !== "object" || value === null) continue;
    const guide = value as Messages;
    if (typeof guide.TITLE !== "string") continue;
    const leaves: Messages = {};
    for (const leaf of CLIENT_DOCS_GUIDE_LEAVES) {
      if (guide[leaf] !== undefined) leaves[leaf] = guide[leaf];
    }
    pruned[key] = leaves;
  }
  return pruned;
}

export function pruneClientMessages(messages: Messages): Messages {
  const prunedDocs = pruneDocsNamespace(
    (messages.DOCS ?? {}) as Messages,
    CLIENT_DOCS_KEPT,
  );
  const prunedDocsChat = pruneDocsNamespace(
    (messages.DOCS_CHAT ?? {}) as Messages,
    CLIENT_DOCS_CHAT_KEPT,
  );
  const prunedDocsPlatform = pruneDocsNamespace(
    (messages.DOCS_PLATFORM ?? {}) as Messages,
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
      const clone = { ...(next as Messages) };
      parent[segment] = clone;
      parent = clone;
    }
    if (resolvable) delete parent[leaf];
  }
  for (const ns of CLIENT_STRIPPED_NAMESPACES) {
    delete pruned[ns];
  }
  return pruned;
}
