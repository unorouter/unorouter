# Episode 12: Marketing surface (home, blog, SEO, footer badges, docs)

## Intent

Homepage, blog engine + comparison posts, SEO machinery (JSON-LD, timestamps, sitemap, robots, IndexNow, llms.txt), directory-badge footer, docs guides.

## Timeline

- Feb 15 - Mar 2: homepage bootstrap (contains most placeholder-message commits).
- Apr 17-18: SEO wave (JSON-LD, timestamps, RSS, blog engine).
- Jun 12 - Jul 10: footer directory-badge saga, ~25 commits: add badge -> point at hosted src for verification -> revert to self-hosted, repeated per directory (Fazier, DANG!, Twelve Tools, TheSaaSDir, AI Toolz Dir, Turbo0, CodeTrendy, SitePatent, MediaProNet, LaunchBoosts removed then restored).
- Jun 20-21: homepage chat mock rebuilt 4x in 8 PRs (#2-#9), then replaced by self-playing animated demo.
- Jun-Jul: comparison blog posts x15+, GEO blocks, 17-19 locale sweeps.
- Jul 4: GSC indexing fix (durable model catalog, canonical dedupe, robots repair).
- Jul 9-10: lighthouse/a11y/CLS endgame.

## Debt markers

- Footer badge hosted/self-hosted flip-flop is a PROCESS pattern (verify with hosted, then self-host); each flip is 2 commits. Candidate: data-driven badge list with a verified flag, one-line changes.
- Homepage chat mock: 4 generations in 2 days; check which generation's components survived and whether dead mock components remain.
- Docs went static-pages -> SETUP_GUIDES data array (good end state); confirm zero static guide leftovers.
- Placeholder commits cluster here (Feb-Mar); those diffs are opaque, but the code is also the oldest and most-superseded. Low value in re-reading them.

## File set

- src/components/pages/navbar/(home)/ sections, footer
- src/i18n/registry.ts, blog components, src/lib/seo/
- scripts/ (seo-timestamps, indexnow, search-index)
- src/components/pages/docs/setup-guides.ts

## Cleanup scope

1. Footer badges -> single data array (name, href, src, hosted flag); kill per-badge JSX.
2. Sweep dead homepage-mock generations.
3. Only alongside other work; this surface is content-hot but code-cold.

## Non-goals

- No SEO behavior changes (GSC fixes are fresh and load-bearing), no blog content edits.
