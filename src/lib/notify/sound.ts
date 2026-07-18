"use client";

let ctx: AudioContext | null = null;

// Two-tone WebAudio chime: no audio asset needed, and unlike the OS
// notification sound it plays regardless of banner visibility. Browsers
// allow it after any prior user gesture; before one it fails silently.
export function playNotifySound() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    const tones: Array<[number, number]> = [
      [880, 0],
      [1174.66, 0.09],
    ];
    for (const tone of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = tone[0];
      const start = now + tone[1];
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    }
  } catch {
    // Audio blocked (no prior gesture / unsupported): skip silently.
  }
}
