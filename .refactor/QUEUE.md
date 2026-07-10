# Cleanup queue (ranked: fix-density x recency x churn)

Source: manual read of all 1526 commits (2026-02-15 to 2026-07-10). One episode per session. Per session: recon subagent -> plan mode -> implement inline (full vertical slice, no barrel stubs) -> separate review -> verify -> commit + push (CI deploys).

| # | Episode | Why this rank | Risk |
| --- | --- | --- | --- |
| 1 | [01-auth-cookies](episodes/01-auth-cookies.md) | Chronic 5-wave churn, revert chain Jul 2-3, Suspense rework 1 day old, cookie logic in 6 homes | Login breakage; verify with real OAuth + guest flows |
| 2 | [02-pricing](episodes/02-pricing.md) | Mid-flight lean/detail split, same-day prod revert, pricing-fetch.ts died and returned in hours | Prod 500 precedent; verify all consumer pages render |
| 3 | [03-chat-engine](episodes/03-chat-engine.md) | 4 rewrites left shadows, Jul 8-10 branch-invariant fix cluster patched 3 sites | Highest blast radius; slice small |
| 4 | [04-sync-remnants](episodes/04-sync-remnants.md) | Dead system still advertised by live names, dormant columns on every table | Needs owner decision: sync coming back? |
| 5 | [05-local-db](episodes/05-local-db.md) | Jul 1 streaming dead end, 3-layer self-heal accretion, convention-only transaction ban | Data loss if self-heal touched wrong; sweep + lint only |
| 6 | [07-models-pages](episodes/07-models-pages.md) | Duplicate-rendering found once already, dehydration half-migrated with episode 02 | Do after or with #2 |
| 7 | [11-rp-entities](episodes/11-rp-entities.md) | Gutted service shells, scattered import surface, junk-drawer overrides drawer | Client-only, low prod risk |
| 8 | [08-vendor-registry](episodes/08-vendor-registry.md) | 45 additive commits, 3 bundle regressions, not one-touch | Mechanical, near-zero risk |
| 9 | [10-playground](episodes/10-playground.md) | generation->playground rename residue, share-feature corpses | Quiet since Jul 1 |
| 10 | [06-sw-pwa](episodes/06-sw-pwa.md) | All-incident code; needs docs consolidation, NOT refactoring | Do not touch behavior |
| 11 | [12-marketing-surface](episodes/12-marketing-surface.md) | Footer badge flip-flop process, dead mock generations | Content-hot code-cold; boy-scout only |
| 12 | [09-badges](episodes/09-badges.md) | Messy but self-contained and cold since Jul 5 | Touch only with next badge feature |

## Cross-cutting notes

- ~30 placeholder-message commits ("Implement feature X...", "Refactor code structure...") cluster in Feb-Mar bootstrap + comment-cleanup sweeps; their code is mostly superseded, do not archaeology them.
- Bulk commits (locale sweeps, dep bumps, comment sweeps) excluded from all churn judgments.
- Episodes 2+6 (pricing + models pages) and 4+5 (sync remnants + local DB) pair naturally if a session has room.
