'use client'

import { useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'
import { useStore } from './store'
import { Mood, Phase } from './types'
import { MOOD_CONFIGS, getPhaseTempo } from './mood-config'
import { MarkovMelody } from './markov'

const PHASE_VOLUMES: Record<Phase, { atmos: number; melody: number; rhythm: number; texture: number }> = {
  calm: { atmos: -6, melody: -60, rhythm: -60, texture: -60 },
  active: { atmos: -3, melody: -8, rhythm: -10, texture: -12 },
  climax: { atmos: 0, melody: -4, rhythm: -6, texture: -8 },
}

export function useAudio() {
  const { audioEnabled, volume, moodEnabled, currentMood, currentPhase } = useStore()
  const soundTexture = useStore(state => state.soundTexture)
  const [masterReady, setMasterReady] = useState(false)
  const analyzerRef = useRef<Tone.Analyser | null>(null)
  const masterGainRef = useRef<Tone.Gain | null>(null)
  const markovRef = useRef<MarkovMelody | null>(null)
  const atmosRef = useRef<Tone.ToneAudioNode[]>([])
  const melodyRef = useRef<{ synth: Tone.PolySynth; loop: Tone.Loop } | null>(null)
  const rhythmRef = useRef<{ gain: Tone.Gain; loop: Tone.Loop } | null>(null)
  const textureRef = useRef<{ noise: Tone.Noise; gain: Tone.Gain } | null>(null)
  const texturePadRef = useRef<{ synth: any; fx: Tone.ToneAudioNode[] } | null>(null)
  const textureVoiceRef = useRef<{ synth: any; fx: Tone.ToneAudioNode[] } | null>(null)
  const textureAccentRef = useRef<{ synth: any; fx: Tone.ToneAudioNode[] } | null>(null)
  const lastTriggerRef = useRef(0)

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
    const padGain = new Tone.Gain(Tone.dbToGain(-18))
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
    const voiceGain = new Tone.Gain(Tone.dbToGain(-12))
    voice.chain(delay, reverb, tremolo, voiceGain, master)
    textureVoiceRef.current = { synth: voice, fx: [delay, reverb, tremolo, voiceGain] }

    const accent = new Tone.PolySynth(Tone.MembraneSynth, {
      pitchDecay: 0.005, octaves: 2,
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
    })
    const accentGain = new Tone.Gain(Tone.dbToGain(-14))
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
    const padGain = new Tone.Gain(Tone.dbToGain(-14))
    pad.chain(chorus, reverb, phaser, padGain, master)
    texturePadRef.current = { synth: pad, fx: [chorus, reverb, phaser, padGain] }

    const voice = new Tone.PolySynth(Tone.AMSynth, {
      harmonicity: 1.2,
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.5, sustain: 0, release: 2 },
    })
    const voiceGain = new Tone.Gain(Tone.dbToGain(-10))
    voice.chain(voiceGain, master)
    textureVoiceRef.current = { synth: voice, fx: [voiceGain] }

    const accent = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.5 },
    })
    const accentGain = new Tone.Gain(Tone.dbToGain(-14))
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
    const padGain = new Tone.Gain(Tone.dbToGain(-14))
    pad.chain(distortion, compressor, autoFilter, padGain, master)
    texturePadRef.current = { synth: pad, fx: [distortion, compressor, autoFilter, padGain] }

    const voice = new Tone.PolySynth(Tone.MonoSynth, {
      oscillator: { type: 'pulse' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.1 },
    })
    const voiceGain = new Tone.Gain(Tone.dbToGain(-10))
    voice.chain(voiceGain, master)
    textureVoiceRef.current = { synth: voice, fx: [voiceGain] }

    const accent = new Tone.MembraneSynth({
      pitchDecay: 0.008, octaves: 2,
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 },
    })
    const accentGain = new Tone.Gain(Tone.dbToGain(-14))
    accent.chain(accentGain, master)
    textureAccentRef.current = { synth: accent, fx: [accentGain] }
  }

  useEffect(() => {
    const setup = async () => {
      if (Tone.context.state !== 'running') {
        await Promise.race([Tone.start(), new Promise<void>(res => setTimeout(res, 500))])
      }
      if (!analyzerRef.current) {
        analyzerRef.current = new Tone.Analyser('fft', 64)
      }
      if (!masterGainRef.current) {
        masterGainRef.current = new Tone.Gain(0.8)
        masterGainRef.current.toDestination()
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
      rhythmRef.current?.gain.dispose()
      textureRef.current?.noise.dispose()
      textureRef.current?.gain.dispose()
      disposeTexture()
      masterGainRef.current?.dispose()
      analyzerRef.current?.dispose()
    }
  }, [])

  useEffect(() => {
    // Map 0-100% to dB: 0% → -60dB (silent), 100% → 0dB (full)
    const db = volume === 0 ? -Infinity : (volume / 100) * 60 - 60
    Tone.getDestination().volume.value = db
  }, [volume])

  useEffect(() => {
    let cancelled = false
    disposeTexture()
    if (!audioEnabled || soundTexture === 'off' || !masterReady || !masterGainRef.current) return
    const setup = async () => {
      if (Tone.context.state !== 'running') {
        await Promise.race([Tone.start(), new Promise<void>(res => setTimeout(res, 500))])
      }
      if (cancelled) return
      const master = masterGainRef.current!
      if (soundTexture === 'glitch') buildGlitchTexture(master)
      else if (soundTexture === 'bloom') buildBloomTexture(master)
      else if (soundTexture === 'bass') buildBassTexture(master)
      if (Tone.Transport.state !== 'started') Tone.Transport.start()
    }
    setup()
    return () => {
      cancelled = true
      disposeTexture()
    }
  }, [audioEnabled, soundTexture, masterReady])

  useEffect(() => {
    if (!audioEnabled || !masterGainRef.current) {
      Tone.Transport.stop()
      Tone.Transport.cancel()
      return
    }

    const build = async () => {
      if (Tone.context.state !== 'running') {
        await Promise.race([Tone.start(), new Promise<void>(res => setTimeout(res, 500))])
      }
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
          const note = markovRef.current.next()
          melodySynth.triggerAttackRelease(note, '8n', time)
        }, '4n')
        melodyLoop.start()
        melodyRef.current = { synth: melodySynth, loop: melodyLoop }
      }

      // Layer 3: Rhythm
      if (vols.rhythm > -60) {
        const rhythmGain = new Tone.Gain(Tone.dbToGain(vols.rhythm))
        rhythmGain.connect(master)
        const rhythmLoop = new Tone.Loop(time => {
          if (Math.random() > 0.3) {
            const synth = new Tone.MembraneSynth({
              pitchDecay: 0.01, octaves: 2,
              envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 },
            }).connect(rhythmGain)
            synth.triggerAttackRelease('C1', '32n', time)
            setTimeout(() => synth.dispose(), 500)
          }
        }, '2n')
        rhythmLoop.start()
        rhythmRef.current = { gain: rhythmGain, loop: rhythmLoop }
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

  const triggerVoice = (brightness: number, noteIndex: number) => {
    if (!audioEnabled) return
    const now = Date.now()
    if (now - lastTriggerRef.current < 50) return
    lastTriggerRef.current = now
    const NOTES = ['C2', 'E2', 'G2', 'A2', 'C3', 'E3', 'G3', 'A3', 'C4', 'E4', 'G4', 'A4']
    const note = NOTES[Math.max(0, Math.min(NOTES.length - 1, noteIndex))]
    if (textureVoiceRef.current) {
      if (soundTexture === 'glitch' && brightness > 0.7) textureVoiceRef.current.synth?.triggerAttackRelease(note, '32n')
      else if (soundTexture === 'bloom' && brightness > 0.5) textureVoiceRef.current.synth?.triggerAttackRelease(note, '8n')
      else if (soundTexture === 'bass' && brightness > 0.3) textureVoiceRef.current.synth?.triggerAttackRelease(note, '16n')
    }
  }

  const triggerClick = () => {
    if (!audioEnabled || !textureAccentRef.current) return
    if (soundTexture === 'glitch' || soundTexture === 'bass') {
      textureAccentRef.current.synth?.triggerAttackRelease('C2', '32n')
    }
  }

  return { analyzerRef, triggerVoice, triggerClick }
}
