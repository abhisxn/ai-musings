/// <reference types="vitest/globals" />
import { folder, levaStore } from 'leva'
import { buildLevaSyncPayload } from '../levaSync'

const SCHEMA = {
  Visuals: folder({
    render: folder({
      mode: { value: 'lines', options: ['lines'] },
      theme: { value: 'dark', options: ['dark'] },
      mood: { value: false, label: 'session arc' },
    }),
  }),
} as const

describe('buildLevaSyncPayload', () => {
  it('returns the unqualified Leva input names (mode/theme/mood)', () => {
    const payload = buildLevaSyncPayload('lines', 'acid', true)
    expect(Object.keys(payload).sort()).toEqual(['mode', 'mood', 'theme'])
    expect(payload).toEqual({ mode: 'lines', theme: 'acid', mood: true })
  })

  it('reflects moodEnabled false alongside the other values', () => {
    const payload = buildLevaSyncPayload('radio', 'dark', false)
    expect(payload).toEqual({ mode: 'radio', theme: 'dark', mood: false })
  })

  it('maps each payload key to the matching Visuals.render.* Leva path', () => {
    const [, mapped] = levaStore.getDataFromSchema(SCHEMA)
    const payload = buildLevaSyncPayload('lines', 'acid', true)
    for (const key of Object.keys(payload) as (keyof typeof payload)[]) {
      expect(mapped[key].path).toBe(`Visuals.render.${key}`)
    }
  })
})