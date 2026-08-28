// Pull a JanitorAI character card out of the site itself, from your own logged-in
// session, and save it as a Chara Card v2 JSON that this app imports directly.
//
// It exists because a card whose creator ticked "hide definition" serves an EMPTY
// personality/scenario/example_dialogs from every read endpoint: the character API,
// the chat API, and the server-rendered page all return the token COUNTS with the
// text stripped. The one place the text still appears is the prompt JanitorAI
// assembles for a generation, and /generateAlpha hands that prompt back to its own
// caller, so one authenticated POST returns what the card page will not show you.
//
// Runs in YOUR browser against YOUR session on purpose: janitorai answers 403 to a
// datacenter address, and the definition is only assembled for a logged-in chat.
//
// Paste into the devtools console on any janitorai.com page.

(async () => {
  const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

  const die = (m) => {
    console.error("%c" + m, "color:#f66;font-weight:bold");
    throw new Error(m);
  };

  if (!/janitorai\.com$/.test(location.hostname)) {
    die("Run this on a janitorai.com page.");
  }

  // The Supabase session is split across two cookies and is the only auth that
  // works; localStorage holds no token on this site.
  const cookie = (n) =>
    document.cookie
      .split("; ")
      .find((c) => c.startsWith(n + "="))
      ?.split("=")
      .slice(1)
      .join("=") || "";
  let token;
  try {
    const raw = decodeURIComponent(
      cookie("sb-auth-auth-token.0") + cookie("sb-auth-auth-token.1"),
    ).replace(/^base64-/, "");
    token = JSON.parse(atob(raw)).access_token;
  } catch {
    die("Not logged in to JanitorAI (no session cookie found).");
  }

  const auth = { accept: "application/json", authorization: "Bearer " + token };

  const characterId =
    UUID.exec(location.pathname)?.[0] ??
    die("Open a character or chat page first (no character id in the URL).");

  // Metadata comes from the character endpoint rather than the page, so this works
  // from a chat URL too, where the server-rendered payload is absent.
  const meta = await fetch(`/hampter/characters/${characterId}`, {
    headers: auth,
  }).then((r) =>
    r.ok ? r.json() : die(`Character fetch failed (${r.status}).`),
  );

  // Proxy-disabled cards never route a prompt anywhere the browser can read, so
  // there is nothing to extract and no point starting a chat.
  if (meta.allow_proxy === false) {
    die(
      `"${meta.name}" has proxies disabled by its creator, so its definition is ` +
        `never sent to the browser. Only the name, avatar and description are available.`,
    );
  }

  const hidden =
    !meta.personality && (meta.token_counts?.personality_tokens ?? 0) > 0;
  console.log(
    `%cJanitorAI: ${meta.name}`,
    "color:#8cf;font-weight:bold",
    hidden
      ? "(definition hidden, extracting from prompt)"
      : "(definition public)",
  );

  // A chat is required: /generateAlpha assembles the prompt for a specific chat,
  // and reuses an existing one rather than piling up new rows.
  const existing = await fetch(
    `/hampter/chats/character/${characterId}/persona?personaId=`,
    { headers: auth },
  )
    .then((r) => (r.ok ? r.text() : ""))
    .catch(() => "");
  let chatId = UUID.test(existing)
    ? null
    : (existing.match(/"id":(\d+)/) || [])[1];

  if (!chatId) {
    const made = await fetch("/hampter/chats", {
      method: "POST",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({ character_id: characterId }),
    }).then((r) => (r.ok ? r.json() : null));
    chatId = made?.id ?? made?.chat?.id;
    if (!chatId) die("Could not open a chat for this character.");
  }

  const chat = await fetch(`/hampter/chats/${chatId}`, { headers: auth }).then(
    (r) => (r.ok ? r.json() : die(`Chat fetch failed (${r.status}).`)),
  );

  // generateMode NEW asks for a fresh assembly rather than a cached one, which is
  // what makes this return the full prompt instead of a continuation.
  const gen = await fetch("/generateAlpha", {
    method: "POST",
    headers: { ...auth, "content-type": "application/json" },
    body: JSON.stringify({
      // Exactly the four fields the site sends: posting the full chat row back is
      // what the API rejects.
      chat: {
        character_id: chat.chat?.character_id ?? characterId,
        id: chat.chat?.id ?? Number(chatId),
        summary: chat.chat?.summary ?? "",
        user_id: chat.chat?.user_id,
      },
      chatMessages: chat.chatMessages ?? [],
      clientPlatform: "web",
      // All false: a cache refetch is for when the CARD changed under a live chat,
      // and forcing one only makes the call slower.
      forcedPromptGenerationCacheRefetch: {
        character: false,
        chat: false,
        profile: false,
        script: false,
      },
      generateMode: "NEW",
      generateType: "CHAT",
      profile: chat.personas?.[0] ?? null,
      profiles: chat.personas ?? [],
      // open_ai_mode "proxy" is the whole trick: it makes JanitorAI assemble the
      // prompt and hand it back for the caller to forward, instead of calling a
      // provider itself. The endpoint is never contacted, so it can be anything,
      // but the shape must be complete or the server answers 502 "your AI provider
      // rejected the API key" while trying to call one for real.
      userConfig: {
        api: "openai",
        open_ai_mode: "proxy",
        open_ai_reverse_proxy: "https://example.invalid/v1/chat/completions",
        reverseProxyKey: "extract",
        openAiModel: "gpt-4",
        openAIKey: null,
        claudeApiKey: null,
        claudeModel: "",
        claude_jailbreak_prompt: "",
        open_ai_jailbreak_prompt: "",
        proxy_global_prompt: "",
        llm_prompt: "",
        bad_words: [],
        allow_mobile_nsfw: true,
        janitor_router_enabled: false,
        text_streaming: false,
        generation_settings: {
          context_length: 50000,
          enable_reasoning: false,
          enable_reasoning_chat: false,
          enable_router_temperature: false,
          enable_short_responses: false,
          max_new_token: 0,
          prefill_enabled: false,
          prefill_text: "",
          temperature: 1,
        },
      },
    }),
  });
  if (!gen.ok) die(`generateAlpha failed (${gen.status}).`);
  const body = await gen.json();

  const system = (body.messages || []).find(
    (m) => m.role === "system" || /Persona>/.test(m.content || ""),
  )?.content;
  if (!system) die("The response carried no prompt to read.");

  // The prompt wraps the definition in <Name's Persona> and appends the reader's
  // own persona, which belongs to the reader and not to the card.
  const persona =
    /<[^>]*Persona>([\s\S]*?)<\/[^>]*Persona>/.exec(system)?.[1]?.trim() ??
    system.replace(/<UserPersona>[\s\S]*?<\/UserPersona>/g, "").trim();

  const card = {
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: {
      name: meta.name || "Imported character",
      description: meta.description || "",
      personality: persona,
      scenario: meta.scenario || "",
      first_mes: chat.character?.first_message || meta.first_message || "",
      mes_example: meta.example_dialogs || "",
      creator: meta.creator_name || "",
      character_version: "",
      system_prompt: "",
      post_history_instructions: "",
      alternate_greetings: (chat.character?.first_messages || []).slice(1),
      tags: (meta.tags || []).map((t) => t?.name ?? t).filter(Boolean),
      extensions: {},
    },
  };

  const safe = (card.data.name || "character").replace(/[^\w.-]+/g, "_");
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(card, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safe}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);

  console.log(
    `%cSaved ${safe}.json  (definition ${persona.length} chars)`,
    "color:#6d6;font-weight:bold",
  );
  console.log("Import it with Characters -> Import in unorouter.");
  return card;
})();
