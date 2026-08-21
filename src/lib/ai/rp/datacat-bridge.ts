// Datacat's published host-page integration (their datacat_st_bridge.js, built
// for SillyTavern embedders). It exists because their API cannot be called from
// another site at all: no response carries an Access-Control-Allow-Origin, and
// the origin sits behind a Cloudflare challenge keyed on IP reputation, so a
// server fetch is refused outright. Framing the page instead puts the request on
// the visitor's own address with their own clearance, and the card comes back
// over postMessage, which CORS does not govern.
//
// The visitor presses Import inside datacat's own UI. Nothing here automates
// that click.

const DATACAT_ORIGIN = "https://datacat.run";

const MSG_READY = "datacat:st-bridge:ready";
const MSG_INIT = "datacat:st-bridge:init";
const MSG_PREPARE = "datacat:st-character-card:prepare";
const MSG_CARD = "datacat:st-character-card";
const MSG_ACK = "datacat:st-character-card:ack";

// Value their bridge checks for; it identifies the embedder, not SillyTavern
// itself, and a different string makes it refuse to hand anything over.
const PARENT_SOURCE = "sillytavern-datacat-browser";

const UUID_RE = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i;

export function datacatCharacterId(input: string): string | null {
  return UUID_RE.exec(input)?.[0].toLowerCase() ?? null;
}

export function datacatEmbedUrl(characterId: string, nonce: string): string {
  const url = new URL(`/characters/${characterId}`, DATACAT_ORIGIN);
  url.searchParams.set("dc_embed", "st");
  url.searchParams.set("dc_bridge_nonce", nonce);
  return url.href;
}

type BridgeMessage = {
  type?: string;
  nonce?: string;
  requestId?: string;
  needsInit?: boolean;
  png?: ArrayBuffer;
  metadata?: { name?: string };
};

type Listener = {
  onCard: (file: File) => Promise<void>;
  onError: (message: string) => void;
};

// Their flow is prepare -> card, and each step waits on an ack that also drives
// the progress text inside their iframe. A missing ack leaves the visitor
// staring at a spinner, so every branch answers.
export function listenForDatacatCard(
  nonce: string,
  listener: Listener,
): () => void {
  const onMessage = async (event: MessageEvent<BridgeMessage>) => {
    if (event.origin !== DATACAT_ORIGIN) return;
    const data = event.data;
    if (!data?.type) return;

    const reply = (payload: Record<string, unknown>) =>
      (event.source as Window | null)?.postMessage(
        { nonce, requestId: data.requestId, ...payload },
        DATACAT_ORIGIN,
      );

    if (data.type === MSG_READY) {
      if (data.needsInit)
        reply({ type: MSG_INIT, source: PARENT_SOURCE, nonce });
      return;
    }

    // The nonce is what separates our frame's traffic from any other bridge on
    // the page; theirs echoes the one we minted for this embed.
    if (data.nonce !== nonce) return;

    // "need-card" tells them we hold no local copy, which is what makes them
    // send the PNG rather than reopening an existing chat.
    if (data.type === MSG_PREPARE) {
      reply({ type: MSG_ACK, status: "need-card" });
      return;
    }

    if (data.type === MSG_CARD) {
      if (!data.png) {
        reply({ type: MSG_ACK, status: "error", message: "no card received" });
        listener.onError("no card received");
        return;
      }
      try {
        const name = data.metadata?.name ?? "card";
        await listener.onCard(
          new File([data.png], `${name}.png`, { type: "image/png" }),
        );
        reply({ type: MSG_ACK, status: "ok" });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "import failed";
        reply({ type: MSG_ACK, status: "error", message });
        listener.onError(message);
      }
    }
  };

  window.addEventListener("message", onMessage);
  return () => window.removeEventListener("message", onMessage);
}
