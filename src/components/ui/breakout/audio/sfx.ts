export type PowerUpAudioKind = 'expand' | 'guard' | 'life' | 'multi' | 'slow'

type ToneOptions = {
  attack?: number
  duration: number
  endFrequency?: number
  filterFrequency?: number
  filterType?: BiquadFilterType
  gain: number
  frequency: number
  release?: number
  startTime?: number
  wave: OscillatorType
}

function playTone(
  context: AudioContext,
  destination: AudioNode,
  options: ToneOptions,
): void {
  const oscillator = context.createOscillator()
  const envelope = context.createGain()
  const attack = options.attack ?? 0.01
  const release = options.release ?? Math.max(0.04, options.duration * 0.65)
  const startTime = options.startTime ?? context.currentTime
  const peakTime = startTime + attack
  const endTime = startTime + options.duration

  oscillator.type = options.wave
  oscillator.frequency.setValueAtTime(options.frequency, startTime)
  if (options.endFrequency !== undefined) {
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(30, options.endFrequency),
      endTime,
    )
  }

  let output: AudioNode = oscillator
  if (options.filterType !== undefined && options.filterFrequency !== undefined) {
    const filter = context.createBiquadFilter()
    filter.type = options.filterType
    filter.frequency.setValueAtTime(options.filterFrequency, startTime)
    oscillator.connect(filter)
    output = filter
  }

  output.connect(envelope)
  envelope.connect(destination)

  envelope.gain.setValueAtTime(0.0001, startTime)
  envelope.gain.exponentialRampToValueAtTime(options.gain, peakTime)
  envelope.gain.exponentialRampToValueAtTime(0.0001, endTime + release)

  oscillator.start(startTime)
  oscillator.stop(endTime + release + 0.02)
}

function playSequence(
  context: AudioContext,
  destination: AudioNode,
  notes: Array<{ duration: number; frequency: number; gain: number; wave: OscillatorType }>,
  options: { gap?: number; filterFrequency?: number; filterType?: BiquadFilterType } = {},
): void {
  let time = context.currentTime
  const gap = options.gap ?? 0.015
  for (let index = 0; index < notes.length; index++) {
    const note = notes[index]!
    playTone(context, destination, {
      duration: note.duration,
      filterFrequency: options.filterFrequency,
      filterType: options.filterType,
      gain: note.gain,
      frequency: note.frequency,
      startTime: time,
      wave: note.wave,
    })
    time += note.duration + gap
  }
}

export function playLaunchSfx(context: AudioContext, destination: AudioNode): void {
  playTone(context, destination, {
    attack: 0.004,
    duration: 0.11,
    endFrequency: 620,
    filterFrequency: 1800,
    filterType: 'lowpass',
    gain: 0.05,
    frequency: 240,
    release: 0.04,
    wave: 'sawtooth',
  })
}

export function playPaddleSfx(context: AudioContext, destination: AudioNode): void {
  playTone(context, destination, {
    attack: 0.002,
    duration: 0.06,
    endFrequency: 360,
    filterFrequency: 1500,
    filterType: 'lowpass',
    gain: 0.04,
    frequency: 760,
    release: 0.03,
    wave: 'square',
  })
}

export function playBrickSfx(
  context: AudioContext,
  destination: AudioNode,
  intensity = 0.5,
): void {
  const center = 520 + intensity * 280
  playSequence(
    context,
    destination,
    [
      { duration: 0.04, frequency: center, gain: 0.028, wave: 'square' },
      { duration: 0.05, frequency: center * 1.23, gain: 0.022, wave: 'triangle' },
    ],
    { filterFrequency: 1900, filterType: 'lowpass', gap: 0.008 },
  )
}

export function playPowerUpSfx(
  context: AudioContext,
  destination: AudioNode,
  kind: PowerUpAudioKind,
): void {
  if (kind === 'guard') {
    playSequence(
      context,
      destination,
      [
        { duration: 0.07, frequency: 280, gain: 0.035, wave: 'triangle' },
        { duration: 0.09, frequency: 420, gain: 0.032, wave: 'square' },
      ],
      { filterFrequency: 1200, filterType: 'lowpass', gap: 0.012 },
    )
    return
  }

  if (kind === 'life') {
    playSequence(
      context,
      destination,
      [
        { duration: 0.06, frequency: 440, gain: 0.03, wave: 'triangle' },
        { duration: 0.06, frequency: 554, gain: 0.032, wave: 'triangle' },
        { duration: 0.09, frequency: 659, gain: 0.035, wave: 'square' },
      ],
      { filterFrequency: 1800, filterType: 'lowpass', gap: 0.014 },
    )
    return
  }

  if (kind === 'slow') {
    playSequence(
      context,
      destination,
      [
        { duration: 0.06, frequency: 620, gain: 0.026, wave: 'square' },
        { duration: 0.08, frequency: 520, gain: 0.03, wave: 'triangle' },
        { duration: 0.1, frequency: 390, gain: 0.033, wave: 'sine' },
      ],
      { filterFrequency: 1500, filterType: 'lowpass', gap: 0.012 },
    )
    return
  }

  if (kind === 'multi') {
    playSequence(
      context,
      destination,
      [
        { duration: 0.05, frequency: 392, gain: 0.026, wave: 'triangle' },
        { duration: 0.05, frequency: 523, gain: 0.028, wave: 'square' },
        { duration: 0.06, frequency: 659, gain: 0.03, wave: 'square' },
        { duration: 0.07, frequency: 784, gain: 0.032, wave: 'sine' },
      ],
      { filterFrequency: 1900, filterType: 'lowpass', gap: 0.01 },
    )
    return
  }

  playSequence(
    context,
    destination,
    [
      { duration: 0.05, frequency: 420, gain: 0.028, wave: 'triangle' },
      { duration: 0.06, frequency: 560, gain: 0.03, wave: 'square' },
      { duration: 0.08, frequency: 700, gain: 0.032, wave: 'square' },
    ],
    { filterFrequency: 1800, filterType: 'lowpass', gap: 0.012 },
  )
}

export function playWaveClearSfx(context: AudioContext, destination: AudioNode): void {
  playSequence(
    context,
    destination,
    [
      { duration: 0.06, frequency: 392, gain: 0.028, wave: 'triangle' },
      { duration: 0.06, frequency: 494, gain: 0.03, wave: 'triangle' },
      { duration: 0.08, frequency: 587, gain: 0.034, wave: 'square' },
      { duration: 0.1, frequency: 784, gain: 0.038, wave: 'square' },
    ],
    { filterFrequency: 1800, filterType: 'lowpass', gap: 0.012 },
  )
}

export function playGuardSaveSfx(context: AudioContext, destination: AudioNode): void {
  playSequence(
    context,
    destination,
    [
      { duration: 0.05, frequency: 330, gain: 0.03, wave: 'triangle' },
      { duration: 0.06, frequency: 440, gain: 0.032, wave: 'square' },
      { duration: 0.08, frequency: 660, gain: 0.034, wave: 'square' },
    ],
    { filterFrequency: 1700, filterType: 'lowpass', gap: 0.01 },
  )
}

export function playLoseLifeSfx(context: AudioContext, destination: AudioNode): void {
  playSequence(
    context,
    destination,
    [
      { duration: 0.08, frequency: 320, gain: 0.03, wave: 'square' },
      { duration: 0.09, frequency: 240, gain: 0.032, wave: 'triangle' },
      { duration: 0.12, frequency: 160, gain: 0.036, wave: 'sawtooth' },
    ],
    { filterFrequency: 1100, filterType: 'lowpass', gap: 0.01 },
  )
}

export function playGameOverSfx(context: AudioContext, destination: AudioNode): void {
  playSequence(
    context,
    destination,
    [
      { duration: 0.12, frequency: 262, gain: 0.034, wave: 'triangle' },
      { duration: 0.12, frequency: 196, gain: 0.036, wave: 'triangle' },
      { duration: 0.18, frequency: 131, gain: 0.04, wave: 'sawtooth' },
    ],
    { filterFrequency: 900, filterType: 'lowpass', gap: 0.018 },
  )
}

export function playToggleSfx(context: AudioContext, destination: AudioNode): void {
  playSequence(
    context,
    destination,
    [
      { duration: 0.04, frequency: 520, gain: 0.02, wave: 'sine' },
      { duration: 0.05, frequency: 680, gain: 0.024, wave: 'sine' },
    ],
    { filterFrequency: 2200, filterType: 'lowpass', gap: 0.008 },
  )
}
