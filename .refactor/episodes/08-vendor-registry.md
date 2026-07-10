# Episode 08: Vendor icons + themes registry

## Intent

Per-vendor brand icon + color theme, consumed by ticker, model cards, badges, chat header.

## Timeline

~45 commits spread over the entire history, purely additive drip: Moonshot (Mar 6), Zhipu, Bailian/ByteDance, Stability, Xiaomi/Minimax, Alibaba, 8-vendor batch (Apr 26), Arcee, AI Singapore/Pollinations, Stepfun/Katanemo/NavyAI/HCompany, 6-vendor batch (Jun 18), VoidAI/Zanity/DeepL/ElevenLabs/Speechify, InternLM/SenseNova, Poolside, Perplexity, Meituan/SwissAI/EuroLLM/Dicta, Voyage/OpenCode Zen, VIDU, Agnes/Requesty/ElectronHub, JetBrains (icon done twice: custom then official SVG), Speakleash/PlLum/Villanova/KINFRA/DeepReinforce (5 commits for 5 names, Jul 8), Abliteration, OrcaRouter, Regolo, Sarvam, Typhoon.

- Apr 28: one consolidation ("consolidate vendor icon handling into a single configuration file").
- Jun 10: chunk-timeout spinner fallback; Jun 11: lazy -> dynamic import swap.
- Jul 10: badge vendor SVG maps moved out of client bundle.

## Debt markers

- Each vendor add = 2-3 file touches (icon loader, theme, sometimes badge map). Jul 8 shows 5 commits for what is one logical change; the add-a-vendor path is not one-touch.
- JetBrains icon redone (custom art replaced by official SVG) = no asset-sourcing convention.
- Bundle-size fixes landed three times (lazy load Apr 16, dynamic import Jun 11, SVG maps out of client Jul 10); the registry keeps regrowing into the bundle.

## File set

- vendor icon loaders + vendor-themes config (src/components/ elements vendor icon module, single config file from Apr 28)
- badge vendor SVG maps (server-side after Jul 10)

## Cleanup scope

1. Make vendor addition one-touch: single registry entry carrying icon ref + theme + badge map, everything else derived.
2. Bundle audit: confirm zero vendor SVGs in client chunks post-Jul-10; add the invariant to CLAUDE.md.

## Non-goals

- No icon redesigns, no theme value changes.
