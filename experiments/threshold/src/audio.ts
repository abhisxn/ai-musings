'use client'

import { useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'
import { useStore, type RenderMode, type Theme } from './store'
import { Mood, Phase } from './types'
import { MOOD_CONFIGS, getPhaseTempo, moodTextureToSoundTexture } from './mood-config'
import { MarkovMelody } from './markov'

export function volumeToDb(volume: number): number {
  if (volume <= 0) return -Infinity
  return -60 + 60 * Math.pow(volume / 100, 0.5)
}

export function getTextureVoicePitchShift(phase: Phase): number {
  if (phase === 'climax') return 12
  if (phase === 'active') return 5
  return 0
}

const MODE_THEME_PITCH_SHIFT: Record<RenderMode, Record<Theme, number>> = {
  radio:    { dark: -3, light: -2, acid: -1, heatmap:  0 },
  dots:     { dark: -2, light: -1, acid:  0, heatmap:  1 },
  blocks:   { dark: -1, light:  0, acid:  1, heatmap:  2 },
  ascii:    { dark:  1, light:  2, acid:  3, heatmap: -3 },
  pixel:    { dark:  2, light:  3, acid: -3, heatmap: -2 },
  ribbon:   { dark:  3, light: -3, acid: -2, heatmap: -1 },
  mesh:     { dark:  2, light:  3, acid: -3, heatmap: -2 },
  dither:   { dark:  3, light: -3, acid: -2, heatmap: -1 },
}

export function getModeThemePitchShift(renderMode: RenderMode, theme: Theme): number {
  return MODE_THEME_PITCH_SHIFT[renderMode][theme]
}

const transposeNote = (note: string, shift: number): string => {
  if (shift === 0) return note
  return Tone.Frequency(note).transpose(shift).toNote()
}

const PHASE_VOLUMES: Record<Phase, { atmos: number; melody: number; rhythm: number; texture: number }> = {
  calm: { atmos: -6, melody: -60, rhythm: -60, texture: -60 },
  active: { atmos: -3, melody: -8, rhythm: -10, texture: -12 },
  climax: { atmos: 0, melody: -4, rhythm: -6, texture: -8 },
}

export async function ensureAudioContext(): Promise<boolean> {
  const state = () => Tone.context.state
  if (state() === 'running') return true
  await Tone.start().catch(() => {})
  const deadline = Date.now() + 2000
  while (state() !== 'running' && Date.now() < deadline) {
    await new Promise<void>(res => setTimeout(res, 50))
  }
  return state() === 'running'
}

export function useAudio() {
  const { audioEnabled, volume, moodEnabled, currentMood, currentPhase } = useStore()
  const soundTexture = useStore(state => state.soundTexture)
  const renderMode = useStore(state => state.renderMode)
  const theme = useStore(state => state.theme)
  const gesture = useStore(state => state.handTracking.gesture)
  const proximity = useStore(state => state.handTracking.proximity)
  const [masterReady, setMasterReady] = useState(false)
  const analyzerRef = useRef<Tone.Analyser | null>(null)
  const masterGainRef = useRef<Tone.Gain | null>(null)
  const proximityFilterRef = useRef<Tone.Filter | null>(null)
  const markovRef = useRef<MarkovMelody | null>(null)
  const atmosRef = useRef<Tone.ToneAudioNode[]>([])
  const melodyRef = useRef<{ synth: Tone.PolySynth; loop: Tone.Loop } | null>(null)
  const rhythmRef = useRef<{ synth: Tone.MembraneSynth; gain: Tone.Gain; loop: Tone.Loop } | null>(null)
  const textureRef = useRef<{ noise: Tone.Noise; gain: Tone.Gain } | null>(null)
  const texturePadRef = useRef<{ synth: any; fx: Tone.ToneAudioNode[] } | null>(null)
  const textureVoiceRef = useRef<{ synth: any; fx: Tone.ToneAudioNode[] } | null>(null)
  const textureAccentRef = useRef<{ synth: any; fx: Tone.ToneAudioNode[] } | null>(null)
  const lastTriggerRef = useRef(0)
  const renderModeRef = useRef<RenderMode>(renderMode)
  const themeRef = useRef<Theme>(theme)
  const lastFlourishGestureRef = useRef<typeof gesture>(null)
  const disposeTexture = () => {
    [texturePadRef, textureVoiceRef, textureAccentRef].forEach(ref => {
      if (ref.current) {
        if (ref.current.synth && 'dispose' in ref.current.synth) ref.current.synth.dispose()
        ref.current.fx.forEach((f: Tone.ToneAudioNode) => f.dispose())
        ref.current = null
      }
    })
  }

  const buildGlitchTexture = (master: Tone.Gain) => {
    const noise = new Tone.Noise('white')
    const bandpass = new Tone.Filter(800, 'bandpass')
    const padGain = new Tone.Gain(Tone.dbToGain(-12))
    noise.chain(bandpass, padGain, master)
    noise.start()
    texturePadRef.current = { synth: noise, fx: [bandpass, padGain] }

    const voice = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 3, modulationIndex: 10,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0.1, release: 1.2 },
    })
    const delay = new Tone.FeedbackDelay(0.25, 0.3)
    const reverb = new Tone.Reverb(2)
    const tremolo = new Tone.Tremolo(6, 0.5).start()
    const voiceGain = new Tone.Gain(Tone.dbToGain(-6))
    voice.chain(delay, reverb, tremolo, voiceGain, master)
    textureVoiceRef.current = { synth: voice, fx: [delay, reverb, tremolo, voiceGain] }

    const accent = new Tone.PolySynth(Tone.MembraneSynth, {
      pitchDecay: 0.005, octaves: 2,
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
    })
    const accentGain = new Tone.Gain(Tone.dbToGain(-8))
    accent.chain(accentGain, master)
    textureAccentRef.current = { synth: accent, fx: [accentGain] }
  }

  const buildBloomTexture = (master: Tone.Gain) => {
    const pad = new Tone.PolySynth(Tone.AMSynth, {
      harmonicity: 1.2,
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.5, decay: 0.5, sustain: 0.4, release: 3 },
    })
    pad.triggerAttack(['C2', 'E2', 'G2'])
    const chorus = new Tone.Chorus(3, 0.5, 1).start()
    const reverb = new Tone.Reverb(4)
    const phaser = new Tone.Phaser(0.5, 3)
    const padGain = new Tone.Gain(Tone.dbToGain(-8))
    pad.chain(chorus, reverb, phaser, padGain, master)
    texturePadRef.current = { synth: pad, fx: [chorus, reverb, phaser, padGain] }

    const voice = new Tone.PolySynth(Tone.AMSynth, {
      harmonicity: 1.2,
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.5, sustain: 0, release: 2 },
    })
    const voiceGain = new Tone.Gain(Tone.dbToGain(-4))
    voice.chain(voiceGain, master)
    textureVoiceRef.current = { synth: voice, fx: [voiceGain] }

    const accent = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.5 },
    })
    const accentGain = new Tone.Gain(Tone.dbToGain(-8))
    accent.chain(accentGain, master)
    textureAccentRef.current = { synth: accent, fx: [accentGain] }
  }

  const buildBassTexture = (master: Tone.Gain) => {
    const pad = new Tone.PolySynth(Tone.MonoSynth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.1, decay: 0.3, sustain: 0.5, release: 2 },
    })
    pad.triggerAttack('C1')
    const distortion = new Tone.Distortion(0.3)
    const compressor = new Tone.Compressor(-24, 3)
    const autoFilter = new Tone.AutoFilter({ frequency: 0.3, depth: 0.8, baseFrequency: 200, octaves: 3.5 }).start()
    const padGain = new Tone.Gain(Tone.dbToGain(-8))
    pad.chain(distortion, compressor, autoFilter, padGain, master)
    texturePadRef.current = { synth: pad, fx: [distortion, compressor, autoFilter, padGain] }

    const voice = new Tone.PolySynth(Tone.MonoSynth, {
      oscillator: { type: 'pulse' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.1 },
    })
    const voiceGain = new Tone.Gain(Tone.dbToGain(-4))
    voice.chain(voiceGain, master)
    textureVoiceRef.current = { synth: voice, fx: [voiceGain] }

    const accent = new Tone.MembraneSynth({
      pitchDecay: 0.008, octaves: 2,
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 },
    })
    const accentGain = new Tone.Gain(Tone.dbToGain(-8))
    accent.chain(accentGain, master)
    textureAccentRef.current = { synth: accent, fx: [accentGain] }
  }

  const buildAmbientTexture = (master: Tone.Gain) => {
    const pad = new Tone.PolySynth(Tone.AMSynth, {
      harmonicity: 1.5,
      oscillator: { type: 'sine' },
      envelope: { attack: 4, decay: 2, sustain: 0.6, release: 8 },
    })
    pad.triggerAttack(['A1', 'C2', 'E2'])
    const lowpass = new Tone.Filter(400, 'lowpass')
    const autoFilter = new Tone.AutoFilter({ frequency: 0.1, depth: 0.7, baseFrequency: 200, octaves: 4 }).start()
    const reverb = new Tone.Reverb(8)
    const chorus = new Tone.Chorus(1, 2, 0.4).start()
    const padGain = new Tone.Gain(Tone.dbToGain(-10))
    pad.chain(lowpass, autoFilter, reverb, chorus, padGain, master)
    texturePadRef.current = { synth: pad, fx: [lowpass, autoFilter, reverb, chorus, padGain] }
    textureVoiceRef.current = null
    textureAccentRef.current = null
  }

  const buildPulseTexture = (master: Tone.Gain) => {
    const sub = new Tone.MembraneSynth({
      pitchDecay: 0.04, octaves: 3,
      envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.2 },
    })
    sub.triggerAttackRelease('C1', '8n')
    const subGain = new Tone.Gain(Tone.dbToGain(-6))
    sub.chain(subGain, master)
    textureAccentRef.current = { synth: sub, fx: [subGain] }

    const arp = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
    })
    const notes = ['C3', 'E3', 'G3', 'C4']
    const arpSequence = new Tone.Sequence((time, note) => {
      arp.triggerAttackRelease(note, '16n', time)
    }, notes, '16n')
    arpSequence.start()
    const arpGain = new Tone.Gain(Tone.dbToGain(-12))
    arp.connect(arpGain)
    arpGain.toDestination()
    texturePadRef.current = { synth: arp, fx: [arpGain] }
    textureVoiceRef.current = null
  }

  const buildBloom2Texture = (master: Tone.Gain) => {
    const pad = new Tone.PolySynth(Tone.AMSynth, {
      harmonicity: 1.2,
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.5, decay: 0.5, sustain: 0.4, release: 3 },
    })
    pad.triggerAttack(['C2', 'E2', 'G2'])
    const chorus = new Tone.Chorus(3, 0.5, 1).start()
    const reverb = new Tone.Reverb(4)
    const phaser = new Tone.Phaser(0.5, 3)
    const padGain = new Tone.Gain(Tone.dbToGain(-8))
    pad.chain(chorus, reverb, phaser, padGain, master)
    texturePadRef.current = { synth: pad, fx: [chorus, reverb, phaser, padGain] }

    const voice = new Tone.PolySynth(Tone.AMSynth, {
      harmonicity: 1.2,
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.5, sustain: 0, release: 2 },
    })
    const voiceGain = new Tone.Gain(Tone.dbToGain(-4))
    voice.chain(voiceGain, master)
    textureVoiceRef.current = { synth: voice, fx: [voiceGain] }

    const accent = new Tone.MetalSynth({
      harmonicity: 5.1, modulationIndex: 32, resonance: 4000,
      envelope: { attack: 0.001, decay: 0.4, release: 0.2 },
    })
    const accentGain = new Tone.Gain(Tone.dbToGain(-10))
    accent.chain(accentGain, master)
    new Tone.Sequence((time) => {
      accent.triggerAttackRelease('C5', '16n', time)
    }, [null, null, 'C5', null, null, null, 'C5', null], '8n').start()
    textureAccentRef.current = { synth: accent, fx: [accentGain] }
  }

  const buildGlitch2Texture = (master: Tone.Gain) => {
    const noise = new Tone.Noise('white')
    const bandpass = new Tone.Filter(800, 'bandpass')
    const padGain = new Tone.Gain(Tone.dbToGain(-12))
    noise.chain(bandpass, padGain, master)
    noise.start()
    texturePadRef.current = { synth: noise, fx: [bandpass, padGain] }

    const bitCrusher = new Tone.BitCrusher(4)
    const voice = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 3, modulationIndex: 10,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0.1, release: 1.2 },
    })
    const delay = new Tone.FeedbackDelay(0.25, 0.3)
    const reverb = new Tone.Reverb(2)
    const tremolo = new Tone.Tremolo(6, 0.5).start()
    const voiceGain = new Tone.Gain(Tone.dbToGain(-6))
    voice.chain(bitCrusher, delay, reverb, tremolo, voiceGain, master)
    textureVoiceRef.current = { synth: voice, fx: [bitCrusher, delay, reverb, tremolo, voiceGain] }

    const accent = new Tone.MembraneSynth({
      pitchDecay: 0.005, octaves: 2,
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
    })
    const accentGain = new Tone.Gain(Tone.dbToGain(-8))
    accent.chain(accentGain, master)
    textureAccentRef.current = { synth: accent, fx: [accentGain] }
  }

  useEffect(() => {
    const setup = async () => {
      await ensureAudioContext()
      if (!analyzerRef.current) {
        analyzerRef.current = new Tone.Analyser('fft', 64)
      }
      if (!masterGainRef.current) {
        masterGainRef.current = new Tone.Gain(0.8)
        proximityFilterRef.current = new Tone.Filter(800, 'lowpass')
        masterGainRef.current.chain(proximityFilterRef.current, Tone.Destination)
        masterGainRef.current.connect(analyzerRef.current)
        setMasterReady(true)
      }
    }
    setup()
    return () => {
      Tone.Transport.stop()
      Tone.Transport.cancel()
      atmosRef.current.forEach(n => n.dispose())
      melodyRef.current?.synth.dispose()
      melodyRef.current?.loop.dispose()
      rhythmRef.current?.loop.dispose()
      rhythmRef.current?.synth.dispose()
      rhythmRef.current?.gain.dispose()
      textureRef.current?.noise.dispose()
      textureRef.current?.gain.dispose()
      disposeTexture()
      analyzerRef.current?.dispose()
      proximityFilterRef.current?.dispose()
      masterGainRef.current?.dispose()
    }
  }, [])

  useEffect(() => {
    Tone.getDestination().volume.value = volumeToDb(volume)
  }, [volume])

  useEffect(() => {
    if (!proximityFilterRef.current) return
    const minFreq = 800
    const maxFreq = 8000
    const target = minFreq + proximity * (maxFreq - minFreq)
    proximityFilterRef.current.frequency.rampTo(target, 0.1)
  }, [proximity])

  useEffect(() => {
    renderModeRef.current = renderMode
  }, [renderMode])

  useEffect(() => {
    themeRef.current = theme
  }, [theme])

  const effectiveTexture = moodEnabled
    ? moodTextureToSoundTexture(MOOD_CONFIGS[currentMood].textureType)
    : soundTexture

  useEffect(() => {
    if (gesture === null) {
      lastFlourishGestureRef.current = null
      return
    }
    if (!audioEnabled) return
    if (gesture === lastFlourishGestureRef.current) return
    if (gesture !== 'fist' && gesture !== 'open_palm' && gesture !== 'pinch' && gesture !== 'thumb_up' && gesture !== 'thumb_down') return
    const target = textureVoiceRef.current?.synth
      ?? melodyRef.current?.synth
      ?? atmosRef.current?.[0]
      ?? textureAccentRef.current?.synth
    lastFlourishGestureRef.current = gesture
    if (!target) return
    const mood = currentMood as Mood
    const scale = MOOD_CONFIGS[mood].scale
    const baseNote = scale[scale.length - 1] ?? 'C4'
    const shift = getModeThemePitchShift(renderModeRef.current, themeRef.current)
    const note = transposeNote(baseNote, shift)
    target.triggerAttackRelease?.(note, '32n')
  }, [gesture, audioEnabled, currentMood])

  useEffect(() => {
    let cancelled = false
    disposeTexture()
    if (!audioEnabled || effectiveTexture === 'off' || !masterReady || !masterGainRef.current) return
    const setup = async () => {
      await ensureAudioContext()
      if (cancelled) return
      const master = masterGainRef.current!
      if (effectiveTexture === 'glitch') buildGlitchTexture(master)
      else if (effectiveTexture === 'glitch2') buildGlitch2Texture(master)
      else if (effectiveTexture === 'ambient') buildAmbientTexture(master)
      else if (effectiveTexture === 'bloom') buildBloomTexture(master)
      else if (effectiveTexture === 'bloom2') buildBloom2Texture(master)
      else if (effectiveTexture === 'pulse') buildPulseTexture(master)
      else if (effectiveTexture === 'bass') buildBassTexture(master)
      if (Tone.Transport.state !== 'started') Tone.Transport.start()
    }
    setup()
    return () => {
      cancelled = true
      disposeTexture()
    }
  }, [audioEnabled, effectiveTexture, masterReady])

  useEffect(() => {
    if (!audioEnabled || !masterGainRef.current) {
      Tone.Transport.stop()
      Tone.Transport.cancel()
      return
    }

    const build = async () => {
      await ensureAudioContext()
      const master = masterGainRef.current!
      const mood = currentMood as Mood
      const phase = currentPhase as Phase
      const config = MOOD_CONFIGS[mood]
      const tempo = getPhaseTempo(mood, phase)
      const vols = PHASE_VOLUMES[phase]

      atmosRef.current.forEach(n => n.dispose())
      melodyRef.current?.synth.dispose()
      melodyRef.current?.loop.dispose()
      rhythmRef.current?.loop.dispose()
      rhythmRef.current?.synth.dispose()
      rhythmRef.current?.gain.dispose()
      textureRef.current?.noise.dispose()
      textureRef.current?.gain.dispose()

      atmosRef.current = []
      melodyRef.current = null
      rhythmRef.current = null
      textureRef.current = null

      // Layer 1: Atmosphere
      let atmosNode: Tone.PolySynth
      if (config.padWaveform === 'amsynth') {
        atmosNode = new Tone.PolySynth(Tone.AMSynth, {
          harmonicity: 1.2, oscillator: { type: 'triangle' },
          envelope: { attack: 2, decay: 1, sustain: 0.5, release: 4 },
        })
        const chorus = new Tone.Chorus(2, 0.3, 0.5).start()
        const reverb = new Tone.Reverb(4)
        const gain = new Tone.Gain(Tone.dbToGain(vols.atmos))
        atmosNode.chain(chorus, reverb, gain, master)
        atmosRef.current = [atmosNode, chorus, reverb, gain]
      } else if (config.padWaveform === 'fmsynth') {
        atmosNode = new Tone.PolySynth(Tone.FMSynth, {
          harmonicity: 2, modulationIndex: 5,
          envelope: { attack: 1, decay: 2, sustain: 0.4, release: 3 },
        })
        const delay = new Tone.FeedbackDelay(0.5, 0.2)
        const tremolo = new Tone.Tremolo(3, 0.3).start()
        const gain = new Tone.Gain(Tone.dbToGain(vols.atmos))
        atmosNode.chain(delay, tremolo, gain, master)
        atmosRef.current = [atmosNode, delay, tremolo, gain]
      } else {
        atmosNode = new Tone.PolySynth(Tone.MonoSynth, {
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.5, decay: 0.5, sustain: 0.6, release: 3 },
        })
        const distortion = new Tone.Distortion(0.2)
        const filter = new Tone.AutoFilter({ frequency: 0.2, depth: 0.5, baseFrequency: 100, octaves: 2 }).start()
        const gain = new Tone.Gain(Tone.dbToGain(vols.atmos))
        atmosNode.chain(distortion, filter, gain, master)
        atmosRef.current = [atmosNode, distortion, filter, gain]
      }
      atmosNode.triggerAttack(config.scale.slice(0, 3))

      // Layer 2: Melody (Markov chain)
      if (vols.melody > -60) {
        markovRef.current = new MarkovMelody(mood)
        const melodySynth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.5 },
        })
        const melodyGain = new Tone.Gain(Tone.dbToGain(vols.melody))
        melodySynth.chain(melodyGain, master)
        const melodyLoop = new Tone.Loop(time => {
          if (!markovRef.current) return
          const rawNote = markovRef.current.next()
          const phaseShift = getTextureVoicePitchShift(currentPhase)
          const modeThemeShift = getModeThemePitchShift(renderModeRef.current, themeRef.current)
          const note = transposeNote(rawNote, phaseShift + modeThemeShift)
          melodySynth.triggerAttackRelease(note, '8n', time)
        }, '4n')
        melodyLoop.start()
        melodyRef.current = { synth: melodySynth, loop: melodyLoop }
      }

      // Layer 3: Rhythm
      if (vols.rhythm > -60) {
        const rhythmGain = new Tone.Gain(Tone.dbToGain(vols.rhythm))
        rhythmGain.connect(master)
        const rhythmSynth = new Tone.MembraneSynth({
          pitchDecay: 0.01, octaves: 2,
          envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 },
        }).connect(rhythmGain)
        const rhythmLoop = new Tone.Loop(time => {
          if (Math.random() > 0.3) {
            rhythmSynth.triggerAttackRelease('C1', '32n', time)
          }
        }, '2n')
        rhythmLoop.start()
        rhythmRef.current = { synth: rhythmSynth, gain: rhythmGain, loop: rhythmLoop }
      }

      // Layer 4: Texture
      if (vols.texture > -60) {
        const textureNoise = new Tone.Noise('brown')
        const textureFilter = new Tone.Filter(phase === 'climax' ? 3000 : 1000, 'lowpass')
        const textureGain = new Tone.Gain(Tone.dbToGain(vols.texture))
        textureNoise.chain(textureFilter, textureGain, master)
        textureNoise.start()
        textureRef.current = { noise: textureNoise, gain: textureGain }
      }

      Tone.Transport.bpm.value = tempo
      if (Tone.Transport.state !== 'started') Tone.Transport.start()
    }

    build()
  }, [audioEnabled, currentMood, currentPhase])

  const triggerVoice = (brightness: number, noteIndex: number, phase?: Phase) => {
    if (!audioEnabled) return
    const now = Date.now()
    if (now - lastTriggerRef.current < 50) return
    lastTriggerRef.current = now
    const NOTES = ['C2', 'E2', 'G2', 'A2', 'C3', 'E3', 'G3', 'A3', 'C4', 'E4', 'G4', 'A4']
    const note = NOTES[Math.max(0, Math.min(NOTES.length - 1, noteIndex))]
    if (textureVoiceRef.current) {
      const phaseShift = getTextureVoicePitchShift(phase ?? currentPhase)
      const modeThemeShift = getModeThemePitchShift(renderModeRef.current, themeRef.current)
      const totalShift = phaseShift + modeThemeShift
      const transposed = transposeNote(note, totalShift)
      if (effectiveTexture === 'glitch' && brightness > 0.7) textureVoiceRef.current.synth?.triggerAttackRelease(transposed, '32n')
      else if (effectiveTexture === 'glitch2' && brightness > 0.7) textureVoiceRef.current.synth?.triggerAttackRelease(transposed, '32n')
      else if (effectiveTexture === 'ambient' && brightness > 0.5) textureVoiceRef.current.synth?.triggerAttackRelease(transposed, '4n')
      else if (effectiveTexture === 'bloom' && brightness > 0.5) textureVoiceRef.current.synth?.triggerAttackRelease(transposed, '8n')
      else if (effectiveTexture === 'bloom2' && brightness > 0.4) textureVoiceRef.current.synth?.triggerAttackRelease(transposed, '16n')
      else if (effectiveTexture === 'bass' && brightness > 0.3) textureVoiceRef.current.synth?.triggerAttackRelease(transposed, '16n')
    }
  }

  const triggerClick = () => {
    if (!audioEnabled || !textureAccentRef.current) return
    if (effectiveTexture === 'glitch' || effectiveTexture === 'glitch2' || effectiveTexture === 'bass' || effectiveTexture === 'pulse') {
      const phaseShift = getTextureVoicePitchShift(currentPhase)
      const modeThemeShift = getModeThemePitchShift(renderModeRef.current, themeRef.current)
      const totalShift = phaseShift + modeThemeShift
      const transposed = transposeNote('C2', totalShift)
      textureAccentRef.current.synth?.triggerAttackRelease(transposed, '32n')
    }
  }

  return { analyzerRef, triggerVoice, triggerClick }
}
