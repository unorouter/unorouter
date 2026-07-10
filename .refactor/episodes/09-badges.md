# Episode 09: Badge system (ops/badge)

## Intent

Satori SVG/PNG badge rendering: 14 templates, OG images for every page family, affiliate badge generator UI, 1h edge cache.

## Timeline

- Apr 10-11 (two days, ~30 commits): entire system built in one burst including two mid-build restructures (module split 6b2ba235, validation/rendering refactor dadea6c4 + b43c12f1) and a cipher animation added then partially removed.
- Apr 18-20: og dimensions tuning drip (5 commits), brand type.
- May 19: template re-add batch.
- Jun 14: sharp native install saga (4 docker commits).
- Jul 4-5: feature-badge trio + chat/social templates.
- Jul 7: comment cleanup.

## Debt markers

- Built fast, restructured twice mid-burst; naming/layering reflects three intra-week designs (typography/cache/i18n/utils modules + templates + primitives + elements).
- Dimension constants (DIMS) tuned by drip commits; magic numbers with no derivation.
- Cipher animation half-removed (removed from tokens-square, kept elsewhere).
- Self-contained and stable since Jul 5 = LOW urgency despite messiness. Classic cold-weird code: fix only when next touched.

## File set

- src/server/ops/badge/ (templates, elements, lib/)
- badge generator UI under affiliate page

## Cleanup scope

1. Only when next badge feature lands: unify template signature + DIMS derivation, finish or fully remove cipher.
2. Nothing proactive.

## Non-goals

- No proactive refactor. Cold code stays cold.
