// Fetches a JanitorAI character card through datacat, from THIS machine.
//
// The gateway cannot do this: datacat is fronted by a Cloudflare managed
// challenge keyed on IP reputation, so every datacenter address gets an
// interstitial while residential ones pass. The clearance cookie is bound to
// the address and TLS fingerprint that earned it, so it cannot be minted here
// and replayed from the cluster either. Running the fetch where the user
// already is sidesteps that instead of defeating it, and being on datacat's
// own origin means the missing CORS header stops mattering.
//
//   bun scripts/fetch-janitor-card.ts <janitorai-url|uuid> [out.json]

import { parseCard } from "@character-foundry/character-foundry/loader";

// The repo has no @types/bun, and adding it to type two lines would change
// resolution for every file. Only what this script touches is declared.
declare const Bun: {
  write(path: string, data: string): Promise<number>;
  WebView: new (opts: { dataStore: { directory: string } }) => {
    navigate(url: string): Promise<void>;
    evaluate(script: string): Promise<unknown>;
    close(): void;
    [Symbol.asyncDispose](): PromiseLike<void>;
  };
};

const UUID_RE = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i;

const input = process.argv[2];
if (!input) {
  console.error(
    "usage: bun scripts/fetch-janitor-card.ts <url|uuid> [out.json]",
  );
  process.exit(1);
}

const id = UUID_RE.exec(input)?.[0].toLowerCase();
if (!id) {
  console.error(`no character uuid found in: ${input}`);
  process.exit(1);
}

// Persisted so the Cloudflare clearance survives between runs; a cold profile
// pays the challenge again on every invocation.
await using view = new Bun.WebView({
  dataStore: { directory: `${process.env.HOME}/.cache/unorouter-cards` },
});

await view.navigate("https://datacat.run/");

if ((await view.evaluate("document.title")) === "Just a moment...") {
  console.error(
    "cloudflare is challenging this machine; open https://datacat.run in a browser first",
  );
  process.exit(1);
}

const card = (await view.evaluate(`(async () => {
  const rand = (n) => crypto.getRandomValues(new Uint8Array(n)).reduce((s, b) => s + b.toString(16).padStart(2, "0"), "");
  const auth = await fetch("/api/liberator/identify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deviceToken: "anon_" + rand(16) + "_" + rand(4) }),
  });
  if (!auth.ok) return { error: "identify failed: " + auth.status };
  const { sessionToken } = await auth.json();

  const res = await fetch("/api/characters/${id}", {
    headers: { accept: "application/json", "x-session-token": sessionToken },
  });
  if (res.status === 404) return { error: "character not found" };
  if (!res.ok) return { error: "fetch failed: " + res.status };

  const body = await res.json();
  const raw = body.character?.chara_card_v2_json;
  if (!raw) return { error: "response carried no card" };
  return { card: typeof raw === "string" ? JSON.parse(raw) : raw };
})()`)) as { card?: Record<string, unknown>; error?: string };

if (card.error || !card.card) {
  console.error(card.error ?? "no card returned");
  process.exit(1);
}

const json = JSON.stringify(card.card, null, 2);

// Fail here rather than at import time, where the only signal is a rejected file.
const parsed = parseCard(new TextEncoder().encode(json));
const data = parsed.card?.data;
if (!data) {
  console.error("datacat returned something the card loader rejected");
  process.exit(1);
}

const out =
  process.argv[3] ?? `${data.name?.replace(/[^\w -]/g, "") || id}.json`;
await Bun.write(out, json);

console.log(`${data.name ?? "(unnamed)"} (${parsed.spec}) -> ${out}`);
console.log(`  description ${(data.description ?? "").length} chars`);
console.log(`  first_mes   ${(data.first_mes ?? "").length} chars`);
