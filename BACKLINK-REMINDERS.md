# Backlink campaign state - UnoRouter (updated 2026-06-10)

## LIVE dofollow (banked)

- **dev.to post** (DOFOLLOW, DR~88): https://dev.to/0don/why-i-use-the-same-llm-key-for-claude-code-and-my-character-chats-502n
  - dev.to bio website link also set (rel `me ugc`, weak)
- **GitHub repo topics x15** (dofollow topic pages): openrouter-alternative, llm-gateway, llm-router, ai-api, roleplay-ai, sillytavern, character-ai, openai-compatible, free-llm-api, ai-marketplace, etc.
- **howardpen9/awesome-ai-api-proxy** PR #15 = **MERGED** -> live dofollow in global_gateways table.
- **Own /blog comparison page** (DOFOLLOW, self-controlled): `/blog/unorouter-vs-openrouter`, all 18 locales. Honest "UnoRouter vs OpenRouter" two-camps post (dev gateway + RP/chat client bridge). Ranks for "OpenRouter alternative" / "UnoRouter vs OpenRouter". Files: `src/components/pages/blog/posts/2026-06-10-unorouter-vs-openrouter-content.tsx`, registry entry in `src/i18n/registry.ts`, `posts.ts` COMPONENTS map, i18n keys `BLOG.POSTS.UNOROUTER_VS_OPENROUTER` in all 18 `public/i18n/*.json`. tsc 0 errors, renders 200 locally. NOT yet pushed/deployed (commit + push -> GitHub Actions builds).

## Pending PRs (dofollow when merged) - all checks green

- public-apis/public-apis (440k): PR #6256
- Hannibal046/Awesome-LLM (27k): PR #645
- cheahjs/free-llm-api-resources (23k): PR #331 (custom Python fetcher, tested live)
- steven2358/awesome-generative-ai (12k): PR #873
- marcelscruz/public-apis (9k): PR #927 (also powers publicapis.dev)
- tensorchord/Awesome-LLMOps (5.8k): PR #562 (DCO sign-off was failing -> FIXED, now green)
- mahseema/awesome-ai-tools (5.4k): PR #1500
- tomasz-buczek/awesome-ai-companions (16): PR #8
- cookii-ai/awesome-ai-roleplay (1): PR #1

## Live nofollow (traffic/brand only, NOT SEO link equity)

- Hashnode post (canonical -> dev.to): https://unorouter.hashnode.dev/why-i-use-the-same-llm-key-for-claude-code-and-my-character-chats

## Gated / prefilled - YOUR manual finish needed

- **HackerNoon** (DA78, dofollow verified): draft FULLY prefilled (title, body w/ dofollow link, 8 tags, meta, TL;DR, image) at app.hackernoon.com/articles/6a274ad11f605ceb1a6f44f9. Blocked on: Complete Profile (signup bug) + originality toggle->No + canonical->dev.to + Submit for review.
- **DZone** (DA82, in-body dofollow verified): registration form prefilled (email support@unorouter.ai, username unorouter, Uno Router, Founder, 1-49, President/CEO). Blocked on: reCAPTCHA + JOIN (human). Then submit article (draft = hackernoon-post-draft.md).
- **AlternativeTo** (DR~81-87, dofollow verified): account too new, submit unlocks **June 16, 2026**. Kit: ../alternativeto-submission-kit.md
- **RapidAPI** (high DA, dofollow): account exists (0-don, Google login; GitHub OAuth is broken their-side). API "unorouter" ALREADY CREATED (provider 12033123) but **PRIVATE/unpublished** -> no public page yet (rapidapi.com/0-don/api/unorouter = "User not found"). To get the dofollow: finish API definition (base URL https://api.unorouter.ai/v1, /chat/completions endpoint) + flip PUBLIC + pass their review. Heavy multi-step; provider SPA doesn't drive via automation - do in browser.

## Skipped (verified NOT worth it)

- Nofollow on the listing link (live-grep busted the SEO-blog "dofollow" claims): SaaSHub, AI Haven, Toolify, TAAFT, Futurepedia, Dang.ai, In Plain English/Medium, IndieHackers, Substack, Telegraph, Hugging Face org page, Reddit (all user links nofollow).
- Off-topic / would be rejected: agent-only awesome-lists (no gateway section), humanloop/awesome-chatgpt (ChatGPT-only), Arindam200/awesome-ai-apps (in-repo code not external tools), APIs.guru (only have internal BFF OpenAPI, not public gateway spec).
- Free-LLM-API lists wanting fixed rate limits (UnoRouter has none): mnfst, amardeeplakshkar.
- OpenAlternative.co: dofollow but OSS-only (UnoRouter closed).
- The 7 launch badges (Startup Fame, Twelve Tools, Fazier, code.market, ShowMeBest, Product Hunt): low-DA / nofollow, traffic only.

## Next veins (not yet started)

- **MCP server**: build + publish an UnoRouter MCP server (npm/PyPI + manifest) -> unlocks official MCP registry + downstream MCP marketplaces (many dofollow). Real dev work in new-api/unorouter. Natural fit (you're a gateway). User flagged this as wanted.
- **Own /blog comparison posts**: "vs OpenRouter/LiteLLM/Portkey" on unorouter.ai/blog (you control dofollow, ranks for comparison queries, becomes the page others cite). Needs content component + registry entry + 19-locale i18n keys (per CLAUDE.md, real native translations).
- **Funnel posts** (nofollow, traffic): r/SillyTavernAI, r/LocalLLaMA, JanitorAI/RP Discords. Needs aged accounts + non-spammy framing (Reddit 9:1 rule). Draft kit not yet written.

## Positioning (locked)

- "AI API + RP/chat in one" - one OpenAI-compatible key for coding agents AND a built-in character chat client. The bridge between dev gateways (MegaLLM/Portkey/LiteLLM/OpenRouter, headless) and RP marketplaces (nano-gpt, NSFW-branded).
- NSFW allowed but NOT branded. Omit from public copy. Directory/ad-safe.

## Key lesson

Dofollow sources for a closed-source hosted RP-gateway are narrow: GitHub (topics + awesome-list PRs + READMEs) and a few editorial dev blogs (dev.to done; HackerNoon/DZone gated). Everything else (RP forums, Reddit, HF, most dirs) is nofollow = traffic, not link equity. Verify rel= LIVE before investing - SEO blogs lie about dofollow constantly.
