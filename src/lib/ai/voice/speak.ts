"use client";

import { stripThinkBlocks } from "@/lib/ai/chat/think-tags";
import type { VoiceSettingsRow } from "@/lib/db/schema/rows";
import {
  FISH_MODELS,
  MAX_TTS_TEXT,
  type FishTtsBody,
} from "@/lib/validation/voice";
import { chatStore } from "@/store/chat-store";
import { atom } from "jotai";

const QUOTE_RE =
  /"[^"\n]+"|\u201c[^\u201d\n]+\u201d|\u201e[^\u201c\n]+\u201c|\u00ab[^\u00bb\n]+\u00bb|\u300c[^\u300d\n]+\u300d/g;

// What a reader would say aloud: no reasoning, code, markup, links or images.
export function speechText(raw: string): string {
  return stripThinkBlocks(raw)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[*_`#~|>]+/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

type Segment = { quoted: boolean; text: string };

function segments(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(QUOTE_RE)) {
    const before = text.slice(last, m.index).trim();
    if (before) out.push({ quoted: false, text: before });
    out.push({ quoted: true, text: m[0] });
    last = m.index + m[0].length;
  }
  const rest = text.slice(last).trim();
  if (rest) out.push({ quoted: false, text: rest });
  return out;
}

const isFishModel = (m: string): m is FishTtsBody["model"] =>
  FISH_MODELS.some((x) => x === m);

// Split mode speaks narration and dialogue in two voices in one request, using
// Fish's speaker tags; any other case is a single voice.
export function buildTtsBody(
  settings: VoiceSettingsRow,
  rawText: string,
  characterVoiceId: string | null,
): FishTtsBody | null {
  const text = speechText(rawText);
  const voice = characterVoiceId || settings.voiceId || null;
  const narrator = settings.narratorVoiceId || null;
  const segs = segments(text);
  const base = {
    model: isFishModel(settings.model) ? settings.model : FISH_MODELS[0],
    speed: settings.speed,
    volume: settings.volume,
  };
  let body: Omit<FishTtsBody, keyof typeof base>;
  if (settings.readMode === "dialogue") {
    const spoken = segs.filter((s) => s.quoted).map((s) => s.text);
    body = { text: spoken.join(" "), referenceIds: voice ? [voice] : [] };
  } else if (
    settings.readMode === "split" &&
    voice &&
    narrator &&
    voice !== narrator &&
    segs.some((s) => s.quoted)
  ) {
    body = {
      text: segs
        .map((s) => `<|speaker:${s.quoted ? 1 : 0}|>${s.text}`)
        .join(" "),
      referenceIds: [narrator, voice],
    };
  } else {
    body = { text, referenceIds: voice ? [voice] : [] };
  }
  if (!body.text.trim()) return null;
  return { ...base, ...body, text: body.text.slice(0, MAX_TTS_TEXT) };
}

async function synthesize(apiKey: string, body: FishTtsBody): Promise<Blob> {
  const res = await fetch("/api/ai/voice/fish/tts", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    // No numeric status on the error: handleError sends any 401 to the login
    // page, and a wrong Fish key is a 401 too.
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    throw new Error(`Fish Audio ${res.status}: ${detail}`);
  }
  return res.blob();
}

// Whatever is loading, playing or paused, so its button can switch.
export type VoicePlayback = { key: string; paused: boolean; loading: boolean };
export const voicePlaybackAtom = atom<VoicePlayback | null>(null);
const setPlayback = (v: VoicePlayback | null) =>
  chatStore.set(voicePlaybackAtom, v);

// iOS only lets audio start without a tap once a tap has resumed the context,
// so one AudioContext is resumed on the first touch and reused.
let ctx: AudioContext | null = null;
let source: AudioBufferSourceNode | null = null;
let generation = 0;

function context(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

let primeArmed = false;

export function primeVoicePlayback() {
  if (primeArmed || typeof window === "undefined") return;
  primeArmed = true;
  window.addEventListener(
    "pointerdown",
    () =>
      void context()
        .resume()
        .catch(() => {}),
    { once: true, capture: true },
  );
}

export function stopVoice() {
  generation++;
  const playing = source;
  source = null;
  if (playing) {
    playing.onended = null;
    playing.stop();
  }
  setPlayback(null);
}

// Suspending the context freezes the one source in place; resuming continues
// it without asking Fish again.
export function pauseVoice() {
  const current = chatStore.get(voicePlaybackAtom);
  if (!ctx || !source || !current) return;
  void ctx.suspend();
  setPlayback({ key: current.key, paused: true, loading: false });
}

export function resumeVoice() {
  const current = chatStore.get(voicePlaybackAtom);
  if (!ctx || !source || !current) return;
  void ctx.resume();
  setPlayback({ key: current.key, paused: false, loading: false });
}

export async function speak(
  key: string,
  settings: VoiceSettingsRow,
  text: string,
  characterVoiceId: string | null,
): Promise<void> {
  const body = buildTtsBody(settings, text, characterVoiceId);
  if (!body) return;
  stopVoice();
  const mine = generation;
  setPlayback({ key, paused: false, loading: true });
  try {
    const ac = context();
    const blob = await synthesize(settings.apiKey, body);
    const buffer = await ac.decodeAudioData(await blob.arrayBuffer());
    if (mine !== generation) return;
    await ac.resume();
    const node = ac.createBufferSource();
    node.buffer = buffer;
    node.connect(ac.destination);
    node.onended = () => {
      if (source === node) stopVoice();
    };
    source = node;
    node.start();
    setPlayback({ key, paused: false, loading: false });
  } catch (err) {
    if (mine === generation) stopVoice();
    throw err;
  }
}
