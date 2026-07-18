/// <reference types="vitest/globals" />
import type { GestureRecognizerResult } from '@mediapipe/tasks-vision'
import { toErrorMessage, toErrorWorkerMessage, toHandGestureResults } from '../gesture-worker'

// Note: the worker's message-handling side (self.onmessage wiring, actual
// MediaPipe model loading/inference) is not unit-tested here - it needs a
// browser + WASM runtime to exercise meaningfully. These tests cover the
// pure data-transform helpers, which are the only parts with real logic.

function makeLandmarks(count: number) {
  return Array.from({ length: count }, (_, i) => ({ x: i * 0.01, y: i * 0.02, z: 0, visibility: 1 }))
}

describe('toHandGestureResults', () => {
  it('maps a single detected hand to landmarks + top gesture + confidence', () => {
    const result = {
      landmarks: [makeLandmarks(21)],
      worldLandmarks: [makeLandmarks(21)],
      handedness: [[{ score: 0.98, index: 0, categoryName: 'Right' }]],
      handednesses: [[{ score: 0.98, index: 0, categoryName: 'Right' }]],
      gestures: [[{ score: 0.87, index: -1, categoryName: 'Closed_Fist' }]],
    } as unknown as GestureRecognizerResult

    const hands = toHandGestureResults(result)

    expect(hands).toHaveLength(1)
    expect(hands[0].landmarks).toHaveLength(21)
    expect(hands[0].handedness).toBe('Right')
    expect(hands[0].gesture).toBe('Closed_Fist')
    expect(hands[0].confidence).toBeCloseTo(0.87)
  })

  it('returns an empty array when no hands are detected', () => {
    const result = {
      landmarks: [],
      worldLandmarks: [],
      handedness: [],
      handednesses: [],
      gestures: [],
    } as unknown as GestureRecognizerResult

    expect(toHandGestureResults(result)).toEqual([])
  })

  it('does not filter low-confidence gestures - that is the consumer responsibility', () => {
    const result = {
      landmarks: [makeLandmarks(21)],
      worldLandmarks: [makeLandmarks(21)],
      handedness: [[{ score: 0.4, index: 0, categoryName: 'Left' }]],
      handednesses: [[{ score: 0.4, index: 0, categoryName: 'Left' }]],
      gestures: [[{ score: 0.12, index: -1, categoryName: 'Open_Palm' }]],
    } as unknown as GestureRecognizerResult

    const hands = toHandGestureResults(result)

    expect(hands[0].confidence).toBeCloseTo(0.12)
    expect(hands[0].gesture).toBe('Open_Palm')
  })

  it('reports gesture as null when a hand has no gesture classification', () => {
    const result = {
      landmarks: [makeLandmarks(21)],
      worldLandmarks: [makeLandmarks(21)],
      handedness: [[{ score: 0.9, index: 0, categoryName: 'Right' }]],
      handednesses: [[{ score: 0.9, index: 0, categoryName: 'Right' }]],
      gestures: [[]],
    } as unknown as GestureRecognizerResult

    const hands = toHandGestureResults(result)

    expect(hands[0].gesture).toBeNull()
    expect(hands[0].confidence).toBe(0)
  })

  it('handles multiple hands independently', () => {
    const result = {
      landmarks: [makeLandmarks(21), makeLandmarks(21)],
      worldLandmarks: [makeLandmarks(21), makeLandmarks(21)],
      handedness: [
        [{ score: 0.9, index: 0, categoryName: 'Left' }],
        [{ score: 0.95, index: 0, categoryName: 'Right' }],
      ],
      handednesses: [
        [{ score: 0.9, index: 0, categoryName: 'Left' }],
        [{ score: 0.95, index: 0, categoryName: 'Right' }],
      ],
      gestures: [
        [{ score: 0.7, index: -1, categoryName: 'Open_Palm' }],
        [{ score: 0.6, index: -1, categoryName: 'Closed_Fist' }],
      ],
    } as unknown as GestureRecognizerResult

    const hands = toHandGestureResults(result)

    expect(hands).toHaveLength(2)
    expect(hands[0].handedness).toBe('Left')
    expect(hands[1].handedness).toBe('Right')
    expect(hands[1].gesture).toBe('Closed_Fist')
  })
})

describe('toErrorMessage', () => {
  it('extracts the message from an Error instance', () => {
    expect(toErrorMessage(new Error('WASM unsupported'))).toBe('WASM unsupported')
  })

  it('passes through a plain string', () => {
    expect(toErrorMessage('boom')).toBe('boom')
  })

  it('stringifies other thrown values rather than throwing', () => {
    expect(toErrorMessage({ code: 42 })).toBe('{"code":42}')
  })

  it('falls back to String() for undefined, where JSON.stringify would return undefined', () => {
    expect(toErrorMessage(undefined)).toBe('undefined')
    expect(typeof toErrorMessage(undefined)).toBe('string')
  })

  it('falls back to String() for a function, where JSON.stringify would return undefined', () => {
    const fn = function boom() {}
    const result = toErrorMessage(fn)
    expect(typeof result).toBe('string')
    expect(result).toBe(String(fn))
  })

  it('falls back to String() for a Symbol, where JSON.stringify would throw', () => {
    const sym = Symbol('boom')
    const result = toErrorMessage(sym)
    expect(typeof result).toBe('string')
    expect(result).toBe('Symbol(boom)')
  })
})

describe('toErrorWorkerMessage', () => {
  it('tags init-phase failures so the consumer can permanently fall back to a legacy detector', () => {
    const msg = toErrorWorkerMessage('init', new Error('WASM unsupported'))
    expect(msg).toEqual({ type: 'error', phase: 'init', message: 'WASM unsupported' })
  })

  it('tags frame-phase failures so the consumer can treat them as a one-off glitch', () => {
    const msg = toErrorWorkerMessage('frame', new Error('recognizeForVideo failed'))
    expect(msg).toEqual({ type: 'error', phase: 'frame', message: 'recognizeForVideo failed' })
  })

  it('distinguishes init vs frame for the same underlying error', () => {
    const err = new Error('same failure')
    const initMsg = toErrorWorkerMessage('init', err)
    const frameMsg = toErrorWorkerMessage('frame', err)
    expect(initMsg.phase).toBe('init')
    expect(frameMsg.phase).toBe('frame')
    expect(initMsg.phase).not.toBe(frameMsg.phase)
  })
})
