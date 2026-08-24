import { logChatDebug } from "@/lib/utils/chat-debug-log";
import type { Plugin } from "unified";
import type { Root } from "hast";

type WithChildren = { children?: unknown[] };

// A rehype plugin that removes a node by splicing its parent's children while
// unist-util-visit is mid-traversal leaves a HOLE: visit re-reads
// parent.children[index] against a length that already shrank, gets undefined,
// and the next visitor throws "Cannot use 'in' operator to search for
// 'children' in undefined", which unmounts the whole message.
//
// Running last, this drops those holes plus any non-object entry before the
// remaining visitors walk the tree. It fixes the SYMPTOM deliberately: the
// plugin doing the mutating is unidentified (five candidates were reproduced
// against the real pipeline and none threw), and a reader should not lose their
// reply to a library's traversal bug while that is being chased.
function prune(node: unknown): void {
  if (typeof node !== "object" || node === null) return;
  const kids = (node as WithChildren).children;
  if (!Array.isArray(kids)) return;
  let holes = 0;
  for (let i = kids.length - 1; i >= 0; i--) {
    const child = kids[i];
    if (typeof child !== "object" || child === null) {
      kids.splice(i, 1);
      holes++;
      continue;
    }
    prune(child);
  }
  if (holes > 0) droppedHoles += holes;
}

let droppedHoles = 0;
let reported = false;

export const rehypeDropHoles: Plugin<[], Root> = () => {
  return (tree: Root) => {
    prune(tree);
    // Once per session, not per render: this runs on every message and the
    // point is to learn that the repair fires at all, not to count renders.
    // Not analytics: this runs during SSR too, and the posthog shim touches
    // document at import time.
    if (droppedHoles > 0 && !reported) {
      reported = true;
      logChatDebug("markdown.holes_dropped", { holes: droppedHoles });
    }
  };
};
