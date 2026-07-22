'use client'

/**
 * Phase 3 Track C — multi-step onboarding walkthrough.
 *
 * Replaces the single "click anywhere to start" splash (formerly inlined in
 * ThresholdView) with a 6-step guided tour. It owns its own step state; the
 * localStorage gate + dismiss/replay wiring still live in ThresholdView (the
 * `threshold_onboarding_done` key), which renders this overlay when its
 * `showOnboarding` flag is set.
 *
 * Styling is intentionally hook-driven: layout/typography use Tailwind
 * utilities, while themable surfaces carry semantic `hud-*` className hooks
 * (see globals.css) wired to per-instance CSS variables (`--hud-bg`,
 * `--hud-accent`, `--swatch`). Track E2 restyles the hooks without touching
 * this markup — hence no heavy one-off inline styles here.
 *
 * Step 3 reuses the green / cyan / orange gesture swatches and reflects the
 * live `handTracking` signal from the store so the user gets immediate
 * detection feedback while practicing each gesture.
 */

import { useEffect, useRef, useState } from 'react'
import { useStore } from './store'
import { type ThemePalette } from './theme'
import {
  ONBOARDING_STEP_COUNT,
  GESTURE_ACTIONS,
  KEYBOARD_SHORTCUTS,
  GESTURE_SWATCHES,
} from './onboardingSteps'

/** A live-detection feedback line for step 3, derived from the tracking signal. */
function detectionStatus(
  status: 'idle' | 'loading' | 'active' | 'failed',
  detected: boolean,
  activeGesture: string | null,
): string {
  if (status === 'failed') return 'GESTURE TRACKING UNAVAILABLE — ambient motion only'
  if (status === 'loading') return 'LOADING HAND MODEL…'
  if (!detected) return 'NO HAND DETECTED — show your hand to the camera'
  if (activeGesture) return `${activeGesture.toUpperCase()} DETECTED`
  return 'HAND DETECTED — make a fist, open palm, or pinch'
}

interface OnboardingOverlayProps {
  palette: ThemePalette
  onDismiss: () => void
}

export default function OnboardingOverlay({ palette, onDismiss }: OnboardingOverlayProps) {
  const [step, setStep] = useState(0)
  const detected = useStore((s) => s.handTracking.detected)
  const gestureEdge = useStore((s) => s.handTracking.gesture)
  const trackingStatus = useStore((s) => s.gestureTrackingStatus)
  const [activeGesture, setActiveGesture] = useState<string | null>(null)
  const latchRef = useRef<number | null>(null)

  // Latch a detected gesture for ~800ms so the matching swatch visibly lights
  // up while the user practices — `handTracking.gesture` is edge-triggered
  // (only set on the frame the gesture is entered), so without latching the
  // highlight would flash for a single frame.
  useEffect(() => {
    if (!gestureEdge) return
    setActiveGesture(gestureEdge)
    if (latchRef.current) window.clearTimeout(latchRef.current)
    latchRef.current = window.setTimeout(() => setActiveGesture(null), 800)
    return () => {
      if (latchRef.current) window.clearTimeout(latchRef.current)
    }
  }, [gestureEdge])

  // Escape dismisses the walkthrough from any step.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDismiss])

  const isLast = step === ONBOARDING_STEP_COUNT - 1
  const statusLine = detectionStatus(trackingStatus, detected, activeGesture)

  // Per-instance theming variables for the hud-* hooks (minimal wiring, not
  // heavy one-off styling — all visual treatment lives in the hook CSS).
  const hudVars = {
    '--hud-bg': palette.background,
    '--hud-accent': palette.accent,
  } as React.CSSProperties

  return (
    <div
      className="hud-onboarding absolute inset-0 z-50 flex flex-col items-center justify-center font-mono p-6"
      style={hudVars}
    >
      <div className="w-full max-w-lg flex flex-col gap-6">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: ONBOARDING_STEP_COUNT }, (_, i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full transition-opacity"
              style={{ background: palette.accent, opacity: i === step ? 1 : 0.25 }}
            />
          ))}
        </div>

        <StepContent
          step={step}
          palette={palette}
          activeGesture={activeGesture}
          statusLine={statusLine}
        />

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onDismiss}
            className="hud-body tracking-[0.25em] opacity-50 hover:opacity-100 transition-opacity"
          >
            SKIP
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="hud-body px-4 py-2 tracking-[0.25em] border transition-opacity disabled:opacity-20"
              style={{ borderColor: palette.accent }}
            >
              BACK
            </button>
            {isLast ? (
              <button
                type="button"
                onClick={onDismiss}
                className="hud-display px-8 py-2 tracking-[0.3em] font-bold transition-transform hover:scale-105"
                style={{ background: palette.accent, color: palette.background }}
              >
                START
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(ONBOARDING_STEP_COUNT - 1, s + 1))}
                className="hud-display px-8 py-2 tracking-[0.3em] font-bold transition-transform hover:scale-105"
                style={{ background: palette.accent, color: palette.background }}
              >
                NEXT
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface StepContentProps {
  step: number
  palette: ThemePalette
  activeGesture: string | null
  statusLine: string
}

function StepContent({ step, palette, activeGesture, statusLine }: StepContentProps) {
  const accent = palette.accent

  if (step === 0) {
    return (
      <div className="text-center flex flex-col gap-4">
        <h2 className="hud-heading text-xl tracking-[0.35em] font-bold">THRESHOLD</h2>
        <p className="hud-body leading-relaxed tracking-[0.15em] opacity-80">
          A VOLUMETRIC TERMINAL INSTRUMENT. YOUR WEBCAM TURNS MOTION INTO A LIVING
          AUDIOVISUAL FIELD — DEPTH, HUE AND THE CAMERA ITSELF RESPOND TO WHERE
          YOUR HAND MOVES.
        </p>
      </div>
    )
  }

  if (step === 1) {
    return (
      <div className="text-center flex flex-col gap-4">
        <h2 className="hud-heading text-base tracking-[0.3em] font-bold">CAMERA &amp; GESTURE</h2>
        <p className="hud-body leading-relaxed tracking-[0.15em] opacity-80">
          THRESHOLD TRACKS ONE HAND IN REAL TIME VIA YOUR WEBCAM. ALLOW CAMERA
          ACCESS WHEN THE BROWSER ASKS. IF THE HAND MODEL CAN&apos;T LOAD, IT FALLS
          BACK TO AMBIENT MOTION DETECTION SO THE FIELD STILL REACTS.
        </p>
      </div>
    )
  }

  if (step === 2) {
    return (
      <div className="flex flex-col items-center gap-6">
        <div className="text-center flex flex-col gap-2">
          <h2 className="hud-heading text-base tracking-[0.3em] font-bold">TRY THE GESTURES</h2>
          <p className="hud-body leading-relaxed tracking-[0.15em] opacity-80">
            MAKE EACH SHAPE FOR YOUR CAMERA. THE MATCHING SWATCH LIGHTS UP WHEN
            IT&apos;S DETECTED.
          </p>
        </div>

        <div className="flex justify-center gap-4">
          {GESTURE_SWATCHES.map((sw) => {
            const active = activeGesture === sw.key
            return (
              <div
                key={sw.key}
                className="hud-swatch w-20 h-28 flex flex-col items-center justify-center border-2 transition-all"
                data-active={active}
                style={{ ['--swatch' as string]: sw.color } as React.CSSProperties}
              >
                <span className="tracking-[0.2em] font-bold">{sw.label}</span>
              </div>
            )
          })}
        </div>

        <div className="hud-body tracking-[0.2em] opacity-70 text-center min-h-[16px]">
          {statusLine}
        </div>
      </div>
    )
  }

  if (step === 3) {
    return (
      <div className="flex flex-col gap-5">
        <div className="text-center flex flex-col gap-2">
          <h2 className="hud-heading text-base tracking-[0.3em] font-bold">GESTURE CONTROLS</h2>
          <p className="hud-body leading-relaxed tracking-[0.15em] opacity-80">
            EACH GESTURE FIRES ONCE AS YOU ENTER IT:
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {GESTURE_ACTIONS.map((g) => {
            const sw = GESTURE_SWATCHES.find((s) => s.label === g.gesture)
            return (
              <div key={g.gesture} className="flex items-center gap-4">
                <span
                  className="hud-swatch w-28 py-2 text-center tracking-[0.2em] font-bold border"
                  style={{ ['--swatch' as string]: sw?.color ?? accent } as React.CSSProperties}
                >
                  {g.gesture}
                </span>
                <span className="hud-body tracking-[0.15em] opacity-80">→</span>
                <span className="hud-body tracking-[0.15em] opacity-80">{g.action.toUpperCase()}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (step === 4) {
    return (
      <div className="flex flex-col gap-5">
        <div className="text-center flex flex-col gap-2">
          <h2 className="hud-heading text-base tracking-[0.3em] font-bold">KEYBOARD SHORTCUTS</h2>
        </div>
        <div className="flex flex-col gap-3">
          {KEYBOARD_SHORTCUTS.map((k) => (
            <div key={k.keys} className="flex items-center gap-4">
              <span
                className="hud-display w-24 py-2 text-center tracking-[0.2em] font-bold border"
                style={{ borderColor: accent }}
              >
                {k.keys}
              </span>
              <span className="hud-body tracking-[0.15em] opacity-80">{k.action.toUpperCase()}</span>
            </div>
          ))}
        </div>
        <p className="hud-body tracking-[0.15em] opacity-50 text-center">
          THEMES CYCLE VIA THE OPEN PALM GESTURE OR THE VISUALS PANEL.
        </p>
      </div>
    )
  }

  // step === 5 (READY)
  return (
    <div className="text-center flex flex-col gap-4">
      <h2 className="hud-heading text-xl tracking-[0.35em] font-bold">READY</h2>
      <p className="hud-body leading-relaxed tracking-[0.15em] opacity-80">
        YOU&apos;RE CALIBRATED. HIT START TO ENTER THE FIELD. REPLAY THIS
        WALKTHROUGH ANY TIME WITH THE ? ICON.
      </p>
    </div>
  )
}
