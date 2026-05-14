'use client'

import { useEffect, useRef } from 'react'
import * as Tone from 'tone'
import { useStore } from './store'

export function useAudio() {
  const { audioEnabled, volume, soundType, audioProfile } = useStore()
  const analyzerRef = useRef<Tone.Analyzer | null>(null)
  const synthRef = useRef<Tone.PolySynth | Tone.Sampler | null>(null)
  const clickSynthRef = useRef<Tone.PolySynth | null>(null)
  
  // Respond to AI Composer audio profile (Task 10)
  useEffect(() => {
    if (!audioProfile) return
    console.log('Audio: AI Composer profile changed to:', audioProfile)
    // TODO: Implement actual Tone.js profile swapping based on audioProfile
  }, [audioProfile])

  // 1. Synth Lifecycle (Swaps when soundType changes)
  useEffect(() => {
    if (!audioEnabled) {
      Tone.getDestination().mute = true
      return
    }

    const setup = async () => {
      await Tone.start()
      Tone.getDestination().mute = false

      if (!analyzerRef.current) {
        analyzerRef.current = new Tone.Analyser('fft', 64)
      }

      // Dispose existing synth
      if (synthRef.current) {
        synthRef.current.dispose()
      }

      let synth: any;
      if (soundType === 'chimes') {
        synth = new Tone.PolySynth(Tone.FMSynth, {
          harmonicity: 3,
          modulationIndex: 10,
          oscillator: { type: 'sine' },
          envelope: { attack: 0.001, decay: 0.3, sustain: 0.1, release: 1.2 }
        }).toDestination()
      } else if (soundType === 'bells') {
        synth = new Tone.PolySynth(Tone.AMSynth, {
          harmonicity: 1.2,
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.005, decay: 0.5, sustain: 0, release: 2 }
        }).toDestination()
      } else if (soundType === 'pulse') {
        synth = new Tone.PolySynth(Tone.MonoSynth, {
          oscillator: { type: 'pulse' },
          envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.1 }
        }).toDestination()
      } else {
        synth = new Tone.PolySynth(Tone.Synth).toDestination()
      }

      synth.connect(analyzerRef.current)
      synthRef.current = synth

      // Click Synth (only create once)
      if (!clickSynthRef.current) {
        clickSynthRef.current = new Tone.PolySynth(Tone.MembraneSynth, {
          pitchDecay: 0.005,
          octaves: 2,
          envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
        }).toDestination()
        clickSynthRef.current.volume.value = -12
      }
    }

    setup()

    return () => {
      // Partial cleanup on soundType change is handled by disposing synthRef.current
    }
  }, [audioEnabled, soundType])

  // 2. Volume Control
  useEffect(() => {
    Tone.getDestination().volume.value = volume
  }, [volume])

  // 3. Full Cleanup
  useEffect(() => {
    return () => {
      synthRef.current?.dispose()
      clickSynthRef.current?.dispose()
      analyzerRef.current?.dispose()
    }
  }, [])

  return { analyzerRef, synthRef, clickSynthRef }
}
