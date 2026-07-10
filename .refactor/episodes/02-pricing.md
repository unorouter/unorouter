# Episode 02: Pricing pipeline

## Intent

Upstream pricing -> processed summary -> every surface: models pages, compare, vendor pages, home ticker, badges, sitemap, model selector, docs snippets. Recent split: lean list payload vs per-model detail endpoint (1.6MB -> 460KB).

## Timeline

- Feb 25 - Mar 2: first pricing API integration, multiplier/reset-label utils.
- Apr 18-22: fixed price + grid pricing, model detail pages, min-tier surfacing.
- May 18: cache pricing model unified cache-write key.
- Jun 14 - Jul 6: display iterations (per-call units, flat pricing tooltips, original prices, multiplier grid support).
- Jul 10 (single day, 8 commits): serializeData slimming -> 500s the page -> REVERT -> lean/detail BFF split -> drop duplicates from dehydration -> pricing-fetch.ts declared dead and REMOVED -> fetchLivePricing RE-ADDED into pricing-fetch.ts same day.

## Debt markers

- Revert same-day (serializeData slimming 500'd production) = fragile serialization path, no test coverage catching it before deploy.
- pricing-fetch.ts removed then recreated within hours; current file content vs its pre-removal role needs reconciling.
- Mid-flight migration: consumers split between full summary (server pages via getCachedPricing) and lean shape (client queries). CLAUDE.md documents the intended split; verify every consumer landed on the right side.
- 5min pricing-cache.ts + Next Data Cache PUBLIC_CACHE + Cloudflare edge = three cache layers; past edge-poisoning incident (SW route) shows stack is easy to misconfigure.

## File set

- src/server/models/pricing/ (route.ts, pricing.service.ts, pricing-fetch.ts, model-catalog.service.ts)
- src/lib/api/pricing.ts (buildPricingSummary, toLeanPricing)
- pricing-cache.ts, src/hooks/models/ pricing hooks, queryKeys.pricing()
- Consumers: models/compare/vendor pages, home, badges lib/cache.ts, sitemap.ts, model selector

## Cleanup scope

1. Audit every pricing consumer: lean vs full, dehydrated vs in-process. Kill accidental full-summary shipping.
2. Reconcile pricing-fetch.ts rebirth: is fetchLivePricing duplicating pricing.service.ts logic?
3. Document/assert the three-layer cache invariants in one place.

## Non-goals

- No pricing display redesign, no upstream schema changes.
