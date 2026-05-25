'use client'

import { useEffect, useRef } from 'react'
import * as Tone from 'tone'
import { useStore } from './store'

const GESTURE_TO_MODE: Record<string, 'glitch' | 'bloom' | 'bass'> = {
  'jazz-hands': 'glitch',
  'peace-sign': 'bloom',
  'fist-pump': 'bass',
}

const NOTES = ['C2', 'E2', 'G2', 'A2', 'C3', 'E3', 'G3', 'A3', 'C4', 'E4', 'G4', 'A4']

export function useAudio() {
  const { audioEnabled, currentGesture, volume } = useStore()
  const analyzerRef = useRef<Tone.Analyser | null>(null)
  const masterGainRef = useRef<Tone.Gain | null>(null)
  const modePadRef = useRef<{ synth: any; fx: Tone.ToneAudioNode[] } | null>(null)
  const modeVoiceRef = useRef<{ synth: any; fx: Tone.ToneAudioNode[] } | null>(null)
  const modeAccentRef = useRef<{ synth: any; fx: Tone.ToneAudioNode[] } | null>(null)
  const prevModeRef = useRef<string | null>(null)
  const lastTriggerTimeRef = useRef(0)

  const buildGlitchMode = (master: Tone.Gain) => {
    // PAD: Noise + Bandpass
    const noise = new Tone.Noise('white')
    const bandpass = new Tone.Filter(800, 'bandpass')
    const padGain = new Tone.Gain(-12)
    noise.chain(bandpass, padGain, master)
    noise.start()
    modePadRef.current = { synth: noise, fx: [bandpass, padGain] }

    // VOICE: FMSynth arpeggios
    const voice = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 3, modulationIndex: 10,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0.1, release: 1.2 },
    })
    const delay = new Tone.FeedbackDelay(0.25, 0.3)
    const reverb = new Tone.Reverb(2)
    const tremolo = new Tone.Tremolo(6, 0.5).start()
    const voiceGain = new Tone.Gain(-6)
    voice.chain(delay, reverb, tremolo, voiceGain, master)
    modeVoiceRef.current = { synth: voice, fx: [delay, reverb, tremolo, voiceGain] }

    // ACCENT: MembraneSynth
    const accent = new Tone.PolySynth(Tone.MembraneSynth, {
      pitchDecay: 0.005, octaves: 2,
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
    })
    const accentGain = new Tone.Gain(-10)
    accent.chain(accentGain, master)
    modeAccentRef.current = { synth: accent, fx: [accentGain] }
  }

  const buildBloomMode = (master: Tone.Gain) => {
    // PAD: AMSynth sustained chord
    const pad = new Tone.PolySynth(Tone.AMSynth, {
      harmonicity: 1.2,
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.5, decay: 0.5, sustain: 0.4, release: 3 },
    })
    pad.triggerAttack(['C2', 'E2', 'G2'])
    const chorus = new Tone.Chorus(3, 0.5, 1).start()
    const reverb = new Tone.Reverb(4)
    const phaser = new Tone.Phaser(0.5, 3)
    const padGain = new Tone.Gain(-12)
    pad.chain(chorus, reverb, phaser, padGain, master)
    modePadRef.current = { synth: pad, fx: [chorus, reverb, phaser, padGain] }

    // VOICE: AMSynth melodies
    const voice = new Tone.PolySynth(Tone.AMSynth, {
      harmonicity: 1.2,
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.5, sustain: 0, release: 2 },
    })
    const voiceGain = new Tone.Gain(-6)
    voice.chain(voiceGain, master)
    modeVoiceRef.current = { synth: voice, fx: [voiceGain] }

    // ACCENT: Sine ping
    const accent = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.5 },
    })
    const accentGain = new Tone.Gain(-10)
    accent.chain(accentGain, master)
    modeAccentRef.current = { synth: accent, fx: [accentGain] }
  }

  const buildBassMode = (master: Tone.Gain) => {
    // PAD: MonoSynth drone
    const pad = new Tone.PolySynth(Tone.MonoSynth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.1, decay: 0.3, sustain: 0.5, release: 2 },
    })
    pad.triggerAttack('C1')
    const distortion = new Tone.Distortion(0.3)
    const compressor = new Tone.Compressor(-24, 3)
    const autoFilter = new Tone.AutoFilter({ frequency: 0.3, depth: 0.8, baseFrequency: 200, octaves: 3.5 }).start()
    const padGain = new Tone.Gain(-12)
    pad.chain(distortion, compressor, autoFilter, padGain, master)
    modePadRef.current = { synth: pad, fx: [distortion, compressor, autoFilter, padGain] }

    // VOICE: MonoSynth pulse
    const voice = new Tone.PolySynth(Tone.MonoSynth, {
      oscillator: { type: 'pulse' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.1 },
    })
    const voiceGain = new Tone.Gain(-6)
    voice.chain(voiceGain, master)
    modeVoiceRef.current = { synth: voice, fx: [voiceGain] }

    // ACCENT: MembraneSynth kick
    const accent = new Tone.MembraneSynth({
      pitchDecay: 0.008, octaves: 2,
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 },
    })
    const accentGain = new Tone.Gain(-10)
    accent.chain(accentGain, master)
    modeAccentRef.current = { synth: accent, fx: [accentGain] }
  }

  const disposeMode = () => {
    [modePadRef, modeVoiceRef, modeAccentRef].forEach(ref => {
      if (ref.current) {
        if (ref.current.synth && 'dispose' in ref.current.synth) ref.current.synth.dispose()
        ref.current.fx.forEach((f: Tone.ToneAudioNode) => f.dispose())
        ref.current = null
      }
    })
  }

  // Build mode audio graph when gesture/mode changes
  useEffect(() => {
    if (!audioEnabled || !masterGainRef.current) {
      if (!audioEnabled) {
        disposeMode()
        prevModeRef.current = null
      }
      return
    }

    const mode = currentGesture ? GESTURE_TO_MODE[currentGesture] : null

    if (!mode) {
      disposeMode()
      prevModeRef.current = null
      return
    }

    if (mode === prevModeRef.current) return

    const setup = async () => {
      await Tone.start()
      disposeMode()

      if (mode === 'glitch') buildGlitchMode(masterGainRef.current!)
      else if (mode === 'bloom') buildBloomMode(masterGainRef.current!)
      else if (mode === 'bass') buildBassMode(masterGainRef.current!)

      prevModeRef.current = mode
      console.log('Audio: Mode built —', mode)
    }

    setup()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioEnabled, currentGesture])

  // Volume control
  useEffect(() => {
    Tone.getDestination().volume.value = volume
  }, [volume])

  // Master setup (once)
  useEffect(() => {
    const setup = async () => {
      await Tone.start()
      if (!analyzerRef.current) {
        analyzerRef.current = new Tone.Analyser('fft', 64)
      }
      if (!masterGainRef.current) {
        masterGainRef.current = new Tone.Gain(0.8)
        masterGainRef.current.toDestination()
        masterGainRef.current.connect(analyzerRef.current)
      }
    }
    setup()
    return () => {
      disposeMode()
      masterGainRef.current?.dispose()
      analyzerRef.current?.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Exposed for Scene.tsx
  const triggerVoice = (brightness: number, noteIndex: number) => {
    if (!modeVoiceRef.current || !audioEnabled) return
    const now = Date.now()
    if (now - lastTriggerTimeRef.current < 50) return
    lastTriggerTimeRef.current = now
    const mode = currentGesture ? GESTURE_TO_MODE[currentGesture] : null
    if (!mode) return

    const idx = Math.max(0, Math.min(NOTES.length - 1, noteIndex))
    const note = NOTES[idx]

    if (mode === 'glitch' && brightness > 0.7) {
      modeVoiceRef.current.synth?.triggerAttackRelease(note, '32n')
    } else if (mode === 'bloom' && brightness > 0.5) {
      modeVoiceRef.current.synth?.triggerAttackRelease(note, '8n')
    } else if (mode === 'bass' && brightness > 0.3) {
      modeVoiceRef.current.synth?.triggerAttackRelease(note, '16n')
    }
  }

  const triggerClick = (note: string = 'C2', duration: string = '32n') => {
    if (!modeAccentRef.current || !audioEnabled) return
    const mode = currentGesture ? GESTURE_TO_MODE[currentGesture] : null
    if (mode === 'glitch') {
      modeAccentRef.current.synth?.triggerAttackRelease(note, duration)
    } else if (mode === 'bass') {
      modeAccentRef.current.synth?.triggerAttackRelease(note, duration)
    }
  }

  return { analyzerRef, triggerVoice, triggerClick, synthRef: null, clickSynthRef: null }
}