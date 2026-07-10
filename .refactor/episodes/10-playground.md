# Episode 10: Playground (image/video generation)

## Intent

Image/video gen: sync image flow + ComfyUI async task flow, reference images, local persistence, session export/import, sweeper.

## Timeline

- May 10-12: built in one wave (models/validation/service, sweeper, refs, img2img tabs, export/import/cloning, VAE picker).
- May 18: ComfyUI submission + sync image handling restructure.
- May 25: dynamic session format, client-first inline data URLs.
- Jun 10-11: a11y labels, SSRF ref caps (security episode overlap).
- Jul 1: playground data management + export moved into local-first layer.
- Quiet since.

## Debt markers

- "generation" -> "playground" rename happened at nav level (May 17) but history shows both vocabularies; check for leftover generation-named modules/keys/routes.
- Shared "generation page and view components" (May 10) predate share-feature removal (May 17 53c1ed58 eliminated share sessions); dead shared-view code possible.
- Row-finalization dedup done once (f138de7f); the submit/poll/finalize split still has three shapes (sync, task, comfy) documented as intentional.

## File set

- src/server/ai/playground/ (8 files)
- src/hooks/ai/playground-hook.ts
- src/lib/ai/playground/dispatch.ts
- src/lib/db/client/data/playground/
- src/app/[locale]/(playground)/

## Cleanup scope

1. Grep generation-era names (routes, query keys, analytics events, translations) and either rename or confirm intentional.
2. Confirm shared-generation view components died with the share feature; delete stragglers.

## Non-goals

- No flow redesign; three submit shapes stay (upstream-dictated).
