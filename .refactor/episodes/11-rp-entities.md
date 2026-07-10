# Episode 11: RP entities + import/export

## Intent

Characters, personas, lorebooks, presets, cards: 100% client-side CRUD via makeRpEntity factory, ST/CCv3 card import/export, conversation transfer formats.

## Timeline

- May 4-6: schema + persona/preset services, lorebook/persona import.
- May 20-22 (dense): local storage adoption, rp/ module structure, overrides drawer split, replaceChildRows, conversation import/export multi-format.
- May 24: services stripped of create/update/delete (factory takeover: fc72c862).
- Jun 21: JanitorAI link import, universal card import via BFF proxy (PRs #11-12).
- Jul 4-6: persona display titles, loadout picker fixes.

## Debt markers

- Server-side RP service files were gutted (May 24) not deleted; check for empty/thin service shells still exported.
- Import parsers went through path moves (aebad14e import-path fixes, 1edfcd5c new AI module structure); import surface spread: src/lib/ai/rp/ + data/rp/rp-export.ts + BFF proxy route + character-foundry dep.
- Overrides drawer split May 20 across 4 commits then re-touched repeatedly (grid layouts Jun 12, fields Jun 19-25, image refs Jul 2); it is the junk drawer of conversation settings.

## File set

- src/hooks/ai/rp/factory.ts + entity hooks
- src/lib/ai/rp/, src/lib/db/client/data/rp/
- overrides drawer components (pages/sidebar/chat/overrides/)
- character card BFF proxy route

## Cleanup scope

1. Delete gutted server service shells if empty.
2. One import module map: format -> parser -> persister; today it takes archaeology to trace a JanitorAI import.
3. Overrides drawer: group fields by the CONVERSATION_SETTINGS_KEYS they write, kill duplicated field wiring.

## Non-goals

- No factory redesign (makeRpEntity is the good pattern here), no new formats.
