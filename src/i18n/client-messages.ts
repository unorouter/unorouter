    // Single source of truth for which messages reach the client; violations throw in dev. Interim until next-intl ships tree-shaking.

type Messages = Record<string, unknown>;

/** Top-level namespaces never sent to the client (server-rendered only). */
export const CLIENT_STRIPPED_NAMESPACES = [
  "TERMS",
  "PRIVACY",
  "WELL_KNOWN",
] as const;

/** Subtrees stripped from otherwise-shipped namespaces. */
export const CLIENT_STRIPPED_SUBTREES = ["BLOG.POSTS"] as const;

/** DOCS subtrees shipped in full (small, used by client components). */
export const CLIENT_DOCS_KEPT = [
  "SETUP",
  "SETUP_GUIDE",
  "CC_SWITCH",
  "GENERATE_API_KEY",
  "GENERATE_API_KEY_DESC",
] as const;

/** Leaves kept per DOCS guide for the megamenu/sidebar; step bodies stay server-only. */
export const CLIENT_DOCS_GUIDE_LEAVES = ["TITLE", "SUBTITLE"] as const;

/** Prune server-only content from the messages sent to the client. */
export function pruneClientMessages(messages: Messages): Messages {
  const docs = (messages.DOCS ?? {}) as Messages;

  const prunedDocs: Messages = {};
  for (const key of CLIENT_DOCS_KEPT) {
    if (docs[key] !== undefined) prunedDocs[key] = docs[key];
  }
  for (const [key, value] of Object.entries(docs)) {
    if (prunedDocs[key] !== undefined) continue;
    if (typeof value !== "object" || value === null) continue;
    const guide = value as Messages;
    if (typeof guide.TITLE !== "string") continue;
    const leaves: Messages = {};
    for (const leaf of CLIENT_DOCS_GUIDE_LEAVES) {
      if (guide[leaf] !== undefined) leaves[leaf] = guide[leaf];
    }
    prunedDocs[key] = leaves;
  }

  const pruned: Messages = { ...messages, DOCS: prunedDocs };
  for (const subtree of CLIENT_STRIPPED_SUBTREES) {
        // Clone the path before deleting: getMessages() returns a shared object; mutating it would strip keys from server rendering too.
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
