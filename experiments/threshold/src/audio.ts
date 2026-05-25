'use client'

import { useEffect, useRef } from 'react'
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
  const analyzerRef = useRef<Tone.Analyser | null>(null)
  const masterGainRef = useRef<Tone.Gain | null>(null)
  const markovRef = useRef<MarkovMelody | null>(null)
  const atmosRef = useRef<Tone.ToneAudioNode[]>([])
  const melodyRef = useRef<{ synth: Tone.PolySynth; loop: Tone.Loop } | null>(null)
  const rhythmRef = useRef<{ gain: Tone.Gain; loop: Tone.Loop } | null>(null)
  const textureRef = useRef<{ noise: Tone.Noise; gain: Tone.Gain } | null>(null)

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
      Tone.Transport.stop()
      Tone.Transport.cancel()
      atmosRef.current.forEach(n => n.dispose())
      melodyRef.current?.synth.dispose()
      melodyRef.current?.loop.dispose()
      rhythmRef.current?.loop.dispose()
      rhythmRef.current?.gain.dispose()
      textureRef.current?.noise.dispose()
      textureRef.current?.gain.dispose()
      masterGainRef.current?.dispose()
      analyzerRef.current?.dispose()
    }
  }, [])

  useEffect(() => {
    Tone.getDestination().volume.value = volume
  }, [volume])

  useEffect(() => {
    if (!audioEnabled || !moodEnabled || !masterGainRef.current) {
      Tone.Transport.stop()
      return
    }

    const build = async () => {
      await Tone.start()
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
        const gain = new Tone.Gain(vols.atmos)
        atmosNode.chain(chorus, reverb, gain, master)
        atmosRef.current = [atmosNode, chorus, reverb, gain]
      } else if (config.padWaveform === 'fmsynth') {
        atmosNode = new Tone.PolySynth(Tone.FMSynth, {
          harmonicity: 2, modulationIndex: 5,
          envelope: { attack: 1, decay: 2, sustain: 0.4, release: 3 },
        })
        const delay = new Tone.FeedbackDelay(0.5, 0.2)
        const tremolo = new Tone.Tremolo(3, 0.3).start()
        const gain = new Tone.Gain(vols.atmos)
        atmosNode.chain(delay, tremolo, gain, master)
        atmosRef.current = [atmosNode, delay, tremolo, gain]
      } else {
        atmosNode = new Tone.PolySynth(Tone.MonoSynth, {
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.5, decay: 0.5, sustain: 0.6, release: 3 },
        })
        const distortion = new Tone.Distortion(0.2)
        const filter = new Tone.AutoFilter({ frequency: 0.2, depth: 0.5, baseFrequency: 100, octaves: 2 }).start()
        const gain = new Tone.Gain(vols.atmos)
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
        const melodyGain = new Tone.Gain(vols.melody)
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
        const rhythmGain = new Tone.Gain(vols.rhythm)
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
        const textureGain = new Tone.Gain(vols.texture)
        textureNoise.chain(textureFilter, textureGain, master)
        textureNoise.start()
        textureRef.current = { noise: textureNoise, gain: textureGain }
      }

      Tone.Transport.bpm.value = tempo
      if (Tone.Transport.state !== 'started') Tone.Transport.start()
    }

    build()
  }, [audioEnabled, moodEnabled, currentMood, currentPhase])

  return { analyzerRef, triggerVoice: () => {}, triggerClick: () => {} }
}
