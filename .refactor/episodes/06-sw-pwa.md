# Episode 06: Service worker / PWA

## Intent

Serwist offline shell: SW served by app route at /sw-worker/sw.js, offline fallback page, queued-send semantics, COEP-safe caching.

## Timeline

- May 29 (single day, 7 commits): PWA built AND three production incidents fixed same day: OPFS worker interception (SQLocal persistence death), navigationPreload nondeterminism, the /serwist path Cloudflare edge-cache poisoning (force-static s-maxage=1yr, un-purgeable, route moved to /sw-worker), force-dynamic 500 revert.
- Jun 10: fetch handling + precache logic refactor (stopImmediatePropagation rules).
- Jul 5: search-index precache exclusion.
- Jul 8-10: no-store forcing, orphan replica + post-deploy ChunkLoadError recovery, esbuild + serwist standalone-output tracing.

## Debt markers

- Every commit here is a production-incident response; near-100% fix ratio. The invariants (which are now LOCKED comments) were each bought with an outage.
- Deploy coupling: SW correctness depends on CI health gates + Cloudflare purge + build-scoped cache wipe. Three repos of knowledge (workflow yaml, next.config, sw.ts) for one invariant set.
- Tracing fixes Jul 10 (esbuild, serwist deps into standalone) suggest the build-output contract is still being discovered.

## File set

- src/app/sw.ts, src/app/sw-worker/[path]/route.ts
- src/components/provider/app/sw-register.tsx
- src/proxy.ts (sw bypass + headers), next.config.ts (withSerwist, headers)
- src/app/[locale]/offline/

## Cleanup scope

1. Write the single invariants doc (one file, referenced from all three touch points) listing every LOCKED rule and the incident behind it; this episode is documentation-debt more than code-debt.
2. Verify no stale references to the poisoned /serwist/ path anywhere.

## Non-goals

- Do NOT change caching strategy, navigationPreload, precache globs, or route dynamics. Every current setting encodes an outage.
