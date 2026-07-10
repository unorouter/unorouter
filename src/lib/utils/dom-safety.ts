// Browser extensions that mutate the DOM (Google Translate, Dark Reader, Grammarly, ad-blockers)
// detach nodes React still owns. When React later commits a removal on a big subtree swap - e.g. a
// locale change or a reset-app-data reload - its `removeChild`/`insertBefore` throws
// `NotFoundError: The node to be removed is not a child of this node`, which white-screens the app.
// The node is already in the desired state, so the operation is a safe no-op. Guard the two DOM
// methods React uses in commit so an extension-detached node degrades gracefully instead of crashing
// the whole tree. This is the widely-used React + Google-Translate survival patch.
let installed = false;

export function installDomReconciliationGuard(): void {
  if (installed || typeof Node === "undefined") return;
  installed = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(
    this: Node,
    child: T,
  ): T {
    if (child.parentNode !== this) return child;
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    this: Node,
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      return originalInsertBefore.call(this, newNode, null) as T;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}
