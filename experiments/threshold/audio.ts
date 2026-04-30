'use client'

import { useEffect, useRef } from 'react'
import * as Tone from 'tone'
import { useStore } from './store'

export function useAudio() {
  const { audioEnabled, volume, soundType } = useStore()
  const analyzerRef = useRef<Tone.Analyser | null>(null)
  const synthRef = useRef<Tone.PolySynth | Tone.Sampler | null>(null)
  const clickSynthRef = useRef<Tone.PolySynth | null>(null)

  useEffect(() => {
    if (!audioEnabled) {
      Tone.getDestination().mute = true
      return
    }

    const setupAudio = async () => {
      await Tone.start()
      Tone.getDestination().mute = false
      
      const analyzer = new Tone.Analyser('fft', 64)
      
      let synth: any;

      if (soundType === 'chimes') {
        synth = new Tone.PolySynth(Tone.FMSynth, {
          harmonicity: 3,
          modulationIndex: 10,
          oscillator: { type: 'sine' },
          envelope: { attack: 0.001, decay: 0.3, sustain: 0.1, release: 1.2 },
          modulation: { type: 'square' },
          modulationEnvelope: { attack: 0.002, decay: 0.2, sustain: 0, release: 0.2 }
        }).toDestination()
      } else if (soundType === 'bells') {
        synth = new Tone.PolySynth(Tone.AMSynth, {
          harmonicity: 1.2,
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.005, decay: 0.5, sustain: 0, release: 2 },
          modulation: { type: 'sine' },
          modulationEnvelope: { attack: 0.1, decay: 0.2, sustain: 1, release: 0.5 }
        }).toDestination()
      } else {
        synth = new Tone.PolySynth(Tone.Synth).toDestination()
      }
      
      synth.connect(analyzer)
      analyzerRef.current = analyzer
      synthRef.current = synth

      // Tactile click synth
      const clickSynth = new Tone.PolySynth(Tone.MembraneSynth, {
        pitchDecay: 0.005,
        octaves: 2,
        envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
      }).toDestination()
      clickSynth.volume.value = -12 // Subtle
      clickSynthRef.current = clickSynth
    }

    setupAudio()

    return () => {
      synthRef.current?.dispose()
      clickSynthRef.current?.dispose()
      analyzerRef.current?.dispose()
    }
  }, [audioEnabled, soundType])

  useEffect(() => {
    Tone.getDestination().volume.value = volume
  }, [volume])

  return { analyzerRef, synthRef, clickSynthRef }
}
