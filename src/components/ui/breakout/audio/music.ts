export type AudioScene = 'serve' | 'playing' | 'game-over'

export type MusicVoice = {
  attack?: number
  detune?: number
  duration: number
  filterFrequency?: number
  filterType?: BiquadFilterType
  gain: number
  notes: Array<number | null>
  release?: number
  wave: OscillatorType
}

export type MusicPattern = {
  steps: number
  tempo: number
  voices: MusicVoice[]
}

const REST = null

export const MUSIC_PATTERNS: Record<AudioScene, MusicPattern> = {
  serve: {
    steps: 8,
    tempo: 84,
    voices: [
      {
        duration: 0.34,
        filterFrequency: 920,
        filterType: 'lowpass',
        gain: 0.045,
        notes: [50, REST, 57, REST, 53, REST, 57, REST],
        release: 0.18,
        wave: 'triangle',
      },
      {
        attack: 0.01,
        duration: 0.16,
        filterFrequency: 1400,
        filterType: 'lowpass',
        gain: 0.024,
        notes: [62, REST, REST, REST, 69, REST, REST, REST],
        release: 0.09,
        wave: 'sine',
      },
    ],
  },
  playing: {
    steps: 16,
    tempo: 116,
    voices: [
      {
        attack: 0.008,
        duration: 0.18,
        filterFrequency: 1800,
        filterType: 'lowpass',
        gain: 0.03,
        notes: [74, 76, 79, 81, 79, 76, 74, 72, 74, 76, 79, 81, 83, 81, 79, 76],
        release: 0.08,
        wave: 'square',
      },
      {
        duration: 0.24,
        filterFrequency: 720,
        filterType: 'lowpass',
        gain: 0.045,
        notes: [50, REST, 50, REST, 53, REST, 53, REST, 55, REST, 55, REST, 53, REST, 50, REST],
        release: 0.12,
        wave: 'triangle',
      },
      {
        attack: 0.004,
        duration: 0.08,
        filterFrequency: 2400,
        filterType: 'bandpass',
        gain: 0.012,
        notes: [86, REST, REST, 86, REST, 86, REST, REST, 88, REST, REST, 88, REST, 86, REST, REST],
        release: 0.04,
        wave: 'sine',
      },
    ],
  },
  'game-over': {
    steps: 8,
    tempo: 72,
    voices: [
      {
        duration: 0.46,
        filterFrequency: 760,
        filterType: 'lowpass',
        gain: 0.05,
        notes: [55, REST, 53, REST, 50, REST, 46, REST],
        release: 0.22,
        wave: 'triangle',
      },
      {
        attack: 0.012,
        duration: 0.26,
        filterFrequency: 1200,
        filterType: 'lowpass',
        gain: 0.022,
        notes: [67, REST, 65, REST, 62, REST, 58, REST],
        release: 0.12,
        wave: 'sine',
      },
    ],
  },
}
