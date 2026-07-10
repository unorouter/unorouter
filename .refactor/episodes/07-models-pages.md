# Episode 07: Models pages (catalog, detail, compare, rankings)

## Intent

Marketing + utility surface: models grid/table, model detail (page + sheet), compare pages, vendor pages, rankings, series filters, virtualization.

## Timeline

- Mar 26: first models filtering + ModelsStore.
- Apr 18: model detail pages v1.
- May 18: restructure + capabilities/perf sections.
- Jun 11-15: virtualization (grid + DataTable), group selector, search localization.
- Jun 14: compare page built (error-recovery components bundled in same commit).
- Jul 6-10: perf endgame: detail page vendor support, shared detail primitives extraction (772741ae), SSR first-screenful, dynamic-import detail sheet, dehydration slimming + revert + re-fix, duplicate tag rendering removed (Jul 10, ModelHeaderChips consolidation).

## Debt markers

- Duplicate-rendering pattern found once already (tags in both ModelHeaderChips and plain-text section); sibling duplications likely (sheet vs page share data but grew separately until 772741ae).
- Jul 10 dehydration work landed via revert-then-retry; the lean/full pricing split (episode 02) intersects here, consumers half-migrated risk.
- ModelsStore (grandfathered TS enum StoreId/ModelTypeFilter) + jotai + query cache = three state layers on one page.

## File set

- src/components/pages/navbar/models/ (grid, table, detail sheet, detail sections, compare)
- src/app/[locale]/(navbar)/models/, compare routes, rankings
- src/hooks/models/, src/store/ models store

## Cleanup scope

1. Diff detail SHEET vs detail PAGE section-by-section; extract remaining shared primitives (continue 772741ae).
2. Audit dehydration boundaries per page against the lean pricing shape.
3. List ModelsStore fields actually read; fold dead filters.

## Non-goals

- No visual redesign, no virtualization rework (fresh and measured).
