import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { isRecord } from "@/lib/utils/base";
import type { Pluggable, Plugin, Processor } from "unified";
import type { Root } from "hast";
import type { VFile } from "vfile";

// A rehype plugin that removes a node by splicing its parent's children while
// unist-util-visit is mid-traversal leaves a HOLE: visit re-reads
// parent.children[index] against a length that already shrank, gets undefined,
// and the next visitor throws "Cannot use 'in' operator to search for
// 'children' in undefined", which unmounts the whole message.
//
// Running last, this drops those holes plus any non-object entry before the
// remaining visitors walk the tree.
//
// The mutator is rehype-mathjax: it calls visitParents itself and replaces
// nodes during that walk. Bracketing it is NOT enough, because the throw
// happens inside its own traversal, before any later plugin runs; see
// withHoleRepair below for the wrapper that survives it.
function prune(node: unknown): void {
  if (!isRecord(node)) return;
  const kids = node.children;
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

// Runs a plugin so its own traversal cannot take the message down with it. The
// throw happens INSIDE rehype-mathjax's visitParents, so a repair pass after it
// never gets to run; catching means a reply with unrenderable math still
// renders as text instead of the whole message unmounting to an error card.
export function withHoleRepair(plugin: Pluggable): Pluggable {
  const [fn, ...opts] = Array.isArray(plugin) ? plugin : [plugin];
  if (typeof fn !== "function") return plugin;
  return function (this: Processor, ...args: unknown[]) {
    const transformer = fn.apply(this, opts.length ? opts : args);
    if (typeof transformer !== "function") return transformer;
    // Arity is the contract: unified decides sync vs async by how many
    // parameters the transformer declares, so passing a `next` it never asked
    // for turns a sync plugin into an async one and runSync then throws
    // "`runSync` finished async".
    return (tree: Root, file: VFile) => {
      prune(tree);
      try {
        const out = transformer(tree, file);
        prune(tree);
        return out;
      } catch (err) {
        prune(tree);
        if (!mathFailed) {
          mathFailed = true;
          logChatDebug("markdown.math_failed", {
            error: String(err).slice(0, 200),
          });
        }
        return tree;
      }
    };
  };
}

let mathFailed = false;

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
