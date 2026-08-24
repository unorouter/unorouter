import {
  MUSIC_PATTERNS,
  type AudioScene,
  type MusicPattern,
  type MusicVoice,
} from "./music";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
import {
  playBrickSfx,
  playGameOverSfx,
  playGuardSaveSfx,
  playLaunchSfx,
  playLoseLifeSfx,
  playPaddleSfx,
  playPowerUpSfx,
  playToggleSfx,
  playWaveClearSfx,
  type PowerUpAudioKind,
} from "./sfx";

const AUDIO_LOOKAHEAD_SECONDS = 0.12;
const AUDIO_SCHEDULER_INTERVAL_MS = 25;

function midiToFrequency(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

class GameAudioManager {
  private context: AudioContext | null = null;
  private currentPattern: MusicPattern | null = null;
  private currentScene: AudioScene = "serve";
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private muted = true;
  private nextStepTime = 0;
  private schedulerId: number | null = null;
  private sfxGain: GainNode | null = null;
  private stepIndex = 0;
  private unlocked = false;

  getMuted(): boolean {
    return this.muted;
  }

  async unlock(): Promise<void> {
    this.ensureContext();
    if (this.context === null) return;

    if (this.context.state !== "running") {
      try {
        await this.context.resume();
      } catch {
        return;
      }
    }

    this.unlocked = true;
    this.applyMute();
    this.ensureSceneMusic();
  }

  setScene(scene: AudioScene): void {
    this.currentScene = scene;
    this.ensureSceneMusic();
  }

  toggleMute(): boolean {
    const wasMuted = this.muted;
    this.muted = !this.muted;
    this.applyMute();

    if (!this.muted) {
      void this.unlock().then(() => {
        if (wasMuted && !this.muted) this.playSfx(playToggleSfx);
      });
    }

    return this.muted;
  }

  playLaunch(): void {
    this.playSfx(playLaunchSfx);
  }

  playPaddle(): void {
    this.playSfx(playPaddleSfx);
  }

  playBrick(intensity = 0.5): void {
    this.playSfx((context, destination) =>
      playBrickSfx(context, destination, intensity),
    );
  }

  playPowerUp(kind: PowerUpAudioKind): void {
    this.playSfx((context, destination) =>
      playPowerUpSfx(context, destination, kind),
    );
  }

  playWaveClear(): void {
    this.playSfx(playWaveClearSfx);
  }

  playGuardSave(): void {
    this.playSfx(playGuardSaveSfx);
  }

  playLoseLife(): void {
    this.playSfx(playLoseLifeSfx);
  }

  playGameOver(): void {
    this.playSfx(playGameOverSfx);
  }

  private ensureContext(): void {
    if (this.context !== null) return;
    if (typeof window === "undefined") return;

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;

    if (AudioContextCtor === undefined) return;

    this.context = new AudioContextCtor();
    this.masterGain = this.context.createGain();
    this.musicGain = this.context.createGain();
    this.sfxGain = this.context.createGain();

    this.masterGain.gain.value = this.muted ? 0 : 0.9;
    this.musicGain.gain.value = 0.38;
    this.sfxGain.gain.value = 0.95;

    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.context.destination);
  }

  private applyMute(): void {
    if (this.context === null || this.masterGain === null) return;
    const target = this.muted ? 0.0001 : 0.9;
    const now = this.context.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(target, now, 0.015);
  }

  private ensureSceneMusic(): void {
    if (
      !this.unlocked ||
      this.context === null ||
      this.context.state !== "running"
    )
      return;
    const nextPattern = MUSIC_PATTERNS[this.currentScene];
    if (this.currentPattern === nextPattern) return;
    this.startPattern(nextPattern);
  }

  private startPattern(pattern: MusicPattern): void {
    this.stopPattern();
    if (this.context === null) return;

    this.currentPattern = pattern;
    this.stepIndex = 0;
    this.nextStepTime = this.context.currentTime + 0.04;
    this.schedulerId = window.setInterval(
      () => this.tickPattern(),
      AUDIO_SCHEDULER_INTERVAL_MS,
    );
  }

  private stopPattern(): void {
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
    this.currentPattern = null;
  }

  private tickPattern(): void {
    if (
      this.context === null ||
      this.musicGain === null ||
      this.currentPattern === null
    )
      return;

    const stepDuration = 60 / this.currentPattern.tempo / 2;
    while (
      this.nextStepTime <
      this.context.currentTime + AUDIO_LOOKAHEAD_SECONDS
    ) {
      this.scheduleStep(this.currentPattern, this.stepIndex, this.nextStepTime);
      this.stepIndex = (this.stepIndex + 1) % this.currentPattern.steps;
      this.nextStepTime += stepDuration;
    }
  }

  private scheduleStep(
    pattern: MusicPattern,
    stepIndex: number,
    time: number,
  ): void {
    for (let index = 0; index < pattern.voices.length; index++) {
      const voice = pattern.voices[index]!;
      const note = voice.notes[stepIndex % voice.notes.length];
      if (note === null) continue;
      this.playMusicVoice(voice, note, time);
    }
  }

  private playMusicVoice(
    voice: MusicVoice,
    note: number,
    startTime: number,
  ): void {
    if (this.context === null || this.musicGain === null) return;

    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    const attack = voice.attack ?? 0.01;
    const release = voice.release ?? Math.max(0.05, voice.duration * 0.55);
    const endTime = startTime + voice.duration;

    oscillator.type = voice.wave;
    oscillator.frequency.setValueAtTime(midiToFrequency(note), startTime);
    if (voice.detune !== undefined) oscillator.detune.value = voice.detune;

    let output: AudioNode = oscillator;
    if (voice.filterType !== undefined && voice.filterFrequency !== undefined) {
      const filter = this.context.createBiquadFilter();
      filter.type = voice.filterType;
      filter.frequency.setValueAtTime(voice.filterFrequency, startTime);
      oscillator.connect(filter);
      output = filter;
    }

    output.connect(envelope);
    envelope.connect(this.musicGain);

    envelope.gain.setValueAtTime(0.0001, startTime);
    envelope.gain.exponentialRampToValueAtTime(voice.gain, startTime + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, endTime + release);

    oscillator.start(startTime);
    oscillator.stop(endTime + release + 0.02);
  }

  private playSfx(
    player: (context: AudioContext, destination: AudioNode) => void,
  ): void {
    if (!this.unlocked || this.context === null || this.sfxGain === null)
      return;
    if (this.context.state !== "running") return;

    try {
      player(this.context, this.sfxGain);
    } catch (error) {
      console.warn("[audio] sfx failed", error);
    }
  }

  stop(): void {
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
    this.currentPattern = null;
    this.muted = true;
    this.unlocked = false;
    if (this.context !== null && this.context.state === "running") {
      void this.context.suspend().catch(() => {});
    }
  }
}

export const gameAudio = new GameAudioManager();
