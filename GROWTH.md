# UnoRouter growth: marketing + backlink campaign (updated 2026-06-10)

Single source of truth for distribution. Two halves: the marketing plan (channels, sequencing) and the backlink campaign state (what is live / pending / gated). Cross-refs: ../competitors.md (competitor map + RP funnel), ../rp-finetune-sourcing.md (RP model sourcing), ../alternativeto-submission-kit.md, ../hackernoon-post-draft.md.

---

# Part 1 - Positioning (locked)

**Wedge: "One OpenAI-compatible key for code AND character chat."** UnoRouter is the bridge between two camps nobody else spans:

- **Dev gateways** (OpenRouter, LiteLLM, Portkey, MegaLLM): headless API, you bring the interface.
- **RP/chat marketplaces** (nano-gpt, Saucepan): chat UI, weak dev story, NSFW-branded.

UnoRouter is both: clean API for coding agents (Claude Code, Cline, OpenCode, Kilo Code, Codex) AND a built-in chat + character client (personas, lorebooks, presets, SillyTavern card import) that also drops into SillyTavern, Janitor.AI, RisuAI, Chub. Same key, models, credits.

- Brand loyalty in AI infra is thin (devs follow performance-per-dollar). A sharp wedge beats out-marketing the incumbent.
- NSFW allowed but NOT branded. Public copy stays clean, directory/ad-safe.
- Market: OpenRouter ~$50M ARR (Mar 2026), 500+ models, 4.2M users, ~5% markup. Do not out-scale it; win the wedge.

---

# Part 2 - Marketing channels (ranked by leverage)

### 1. Programmatic comparison-page SEO (highest-leverage, autonomous)
#1 scalable organic play for an aggregator. Moat: live model + pricing data (212 models, real stats at api.unorouter.ai/api/pricing) competitors cannot copy. Pattern proven: `/blog/unorouter-vs-openrouter` shipped (18 locales). Build the engine, one page per intent bucket:
- Comparison: `unorouter-vs-litellm`, `unorouter-vs-portkey`, `unorouter-vs-nano-gpt`, `unorouter-vs-megallm`
- Decision: `best-openrouter-alternatives-2026`, `best-ai-gateway-for-sillytavern`
- Process: `how-to-connect-any-llm-to-sillytavern`, `one-api-key-for-claude-code-and-roleplay`
- Definitional: `what-is-an-llm-gateway`

Each: 18-locale native translations (CLAUDE.md rule), honest framing, links to /register + /models. Compounds: 92% correlation between top-10 organic rank and AI-Overview citations; ranks AND feeds AEO. New-domain SEO ramps in 3-6 months, so start now.

### 2. RP community funnel (your real audience; needs your accounts)
competitors.md: members live in r/SillyTavernAI, r/JanitorAI, RP Discords, NOT directories (DISBOARD "ai api" tag near-empty). Links nofollow (no juice) but highest-intent + brand. Rule: participate genuinely, solve problems first, mention UnoRouter only when relevant; Reddit/Discord remove promo + shadowban fresh accounts (need aged ones). Fit: "connect any model to SillyTavern/Janitor with one key" guides, honest comparisons when asked, new-model announcements. Use community as a product feedback loop.

### 3. AEO (always-on)
Search fragmenting to AI answers (Gartner ~25% traditional-search drop by 2026; AI Overviews on ~55% of Google searches). Citation drivers: freshness (83% of commercial-query cites are <12mo pages), expert quotes (+41%), statistics (+30%), first-party data (your live usage/pricing). Do not abandon SEO for AEO: search-first foundations, answer-first formatting; the comparison pages double as AEO assets. WebMCP (shipped at /.well-known/mcp.json) aids agent-discoverability + AI-answer citation (not an SEO backlink).

### 4. Framework / SDK integration (highest-ROI distribution; needs you)
OpenRouter got ~60% of signups via Vercel/Next integrations + a HuggingFace partnership. Get UnoRouter listed as a provider option in coding-agent docs/default configs: Cline, OpenCode, Kilo Code, Codex, Cherry Studio, CC Switch (some already work; get into docs + provider dropdowns). Default-option placement is the highest-leverage infra distribution.

### 5. Product Hunt (awareness, when ready; needs you)
Only with sub-2-min onboarding + 30-day pre-launch supporter list + post-launch conversion plan (the #1 failure mode is no post-launch system). Tue-Thu, ship 12:01 AM Pacific, reply to every comment, never ask for upvotes (ask visits/comments), hunt it yourself. Multi-launch each major feature; badges compound. Not yet; do after funnel + SEO compound.

### Sequenced plan
1. Lock wedge (done). 2. Build comparison/intent-page engine now (autonomous, compounds 3-6mo). 3. Be genuinely present in r/SillyTavernAI + r/JanitorAI + RP Discords. 4. Pursue coding-agent/SDK provider listings. 5. Run AEO always-on (pages = assets). 6. Product Hunt once onboarding sub-2-min + list + conversion plan; relaunch per feature.

Strategic note: community + SEO acquire devs cheaply; governance/observability features for teams (where the incumbent is weakest) convert that into revenue later.

---

# Part 3 - Backlink campaign state

## LIVE dofollow (banked)
- **dev.to post** (DR~88): https://dev.to/0don/why-i-use-the-same-llm-key-for-claude-code-and-my-character-chats-502n (+ dev.to bio link, rel `me ugc`, weak)
- **GitHub repo topics x15** (dofollow topic pages): openrouter-alternative, llm-gateway, llm-router, ai-api, roleplay-ai, sillytavern, character-ai, openai-compatible, free-llm-api, ai-marketplace, etc.
- **howardpen9/awesome-ai-api-proxy** PR #15 = MERGED -> live dofollow in global_gateways table.
- **Own /blog comparison page** `/blog/unorouter-vs-openrouter`, 18 locales (committed `501515f4`, NOT yet pushed -> push triggers GitHub Actions build). Files: `src/components/pages/blog/posts/2026-06-10-unorouter-vs-openrouter-content.tsx`, registry entry in `src/i18n/registry.ts`, `posts.ts` COMPONENTS map, i18n keys `BLOG.POSTS.UNOROUTER_VS_OPENROUTER` in all 18 `public/i18n/*.json`.

## Pending PRs (dofollow when merged) - all checks green
- public-apis/public-apis (440k): PR #6256
- Hannibal046/Awesome-LLM (27k): PR #645
- cheahjs/free-llm-api-resources (23k): PR #331 (custom Python fetcher, tested live)
- steven2358/awesome-generative-ai (12k): PR #873
- marcelscruz/public-apis (9k): PR #927 (also powers publicapis.dev)
- tensorchord/Awesome-LLMOps (5.8k): PR #562 (DCO fixed, green)
- mahseema/awesome-ai-tools (5.4k): PR #1500
- tomasz-buczek/awesome-ai-companions (16): PR #8
- cookii-ai/awesome-ai-roleplay (1): PR #1

## Live nofollow (traffic/brand only)
- Hashnode post (canonical -> dev.to): https://unorouter.hashnode.dev/why-i-use-the-same-llm-key-for-claude-code-and-my-character-chats

## Gated / prefilled - YOUR manual finish needed
- **HackerNoon** (DA78, dofollow): draft FULLY prefilled (title, body w/ dofollow link, 8 tags, meta, TL;DR, image) at app.hackernoon.com/articles/6a274ad11f605ceb1a6f44f9. Blocked on: Complete Profile (signup bug) + originality toggle->No + canonical->dev.to + Submit.
- **DZone** (DA82, in-body dofollow): registration form prefilled (email support@unorouter.ai, username unorouter, Uno Router, Founder, 1-49, President/CEO). Blocked on: reCAPTCHA + JOIN (human). Then submit article (draft = ../hackernoon-post-draft.md).
- **AlternativeTo** (DR~81-87, dofollow): account too new, submit unlocks **June 16, 2026**. Kit: ../alternativeto-submission-kit.md
- **RapidAPI** (high DA, dofollow): account exists (0-don, Google login; GitHub OAuth broken their-side). API "unorouter" CREATED (provider 12033123) but PRIVATE/unpublished -> no public page (rapidapi.com/0-don/api/unorouter = "User not found"). To get dofollow: finish API definition (base URL https://api.unorouter.ai/v1, /chat/completions) + flip PUBLIC + pass review. Heavy; provider SPA resists automation, do in browser.

## Skipped (verified NOT worth it)
- Nofollow on the listing link (live-grep busted SEO-blog "dofollow" claims): SaaSHub, AI Haven, Toolify, TAAFT, Futurepedia, Dang.ai, In Plain English/Medium, IndieHackers, Substack, Telegraph, HuggingFace org page, Reddit (all user links nofollow).
- Off-topic / reject risk: agent-only awesome-lists (no gateway section), humanloop/awesome-chatgpt (ChatGPT-only), Arindam200/awesome-ai-apps (in-repo code), APIs.guru (only internal BFF OpenAPI, not public gateway spec).
- Free-LLM-API lists wanting fixed rate limits (UnoRouter has none): mnfst, amardeeplakshkar.
- OpenAlternative.co: dofollow but OSS-only (UnoRouter closed).
- 7 launch badges (Startup Fame, Twelve Tools, Fazier, code.market, ShowMeBest, Product Hunt): low-DA / nofollow, traffic only.

## Backlink key lesson
Dofollow sources for a closed-source hosted RP-gateway are narrow: GitHub (topics + awesome-list PRs + READMEs) and a few editorial dev blogs (dev.to done; HackerNoon/DZone gated) + AlternativeTo. Everything else (RP forums, Reddit, HF, most dirs) is nofollow = traffic, not link equity. Verify rel= LIVE before investing; SEO blogs lie about dofollow constantly.

---

# Part 4 - Autonomous vs needs-you
- **Autonomous (I can build):** comparison-page engine, AEO content, marketing copy, draft community posts, draft integration-listing submissions, more awesome-list PRs.
- **Needs you (account/identity/judgment):** community posting (aged accounts), Product Hunt launch, SDK-integration outreach, finishing the 4 gated backlink targets, anything requiring your login.

# Next veins (not started)
- **MCP server (server-side)**: a stdio/HTTP MCP server (npm/PyPI + manifest) would unlock the official MCP registry + downstream marketplaces. NOTE: current WebMCP (browser-only) does NOT qualify for the registry and gives no backlink; a server-side MCP is real new dev work.
- Comparison-page engine batch (see Part 2.1) - the ready-to-go autonomous play.
