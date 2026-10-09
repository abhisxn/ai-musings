'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { LOGO_VIEWBOX, WORDMARK, STROKE_TOP, STROKE_BOTTOM } from './logoPaths'

const MARKER_COUNT = 5; // --marker-0 … --marker-4 in globals.css
const SWEEP_EASE = [0.25, 0.46, 0.45, 0.94] as const
const SWEEP_DURATION = 0.45
const SWEEP_STAGGER = 0.18

function Wordmark({ className }: { className: string }) {
  return (
    <g className={className} transform={`translate(${WORDMARK.x} ${WORDMARK.y})`}>
      {WORDMARK.paths.map((d, i) => <path key={i} d={d} />)}
    </g>
  )
}

export function Logo({ className = '' }: { className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const reduceMotion = useReducedMotion()
  const [colorIndex, setColorIndex] = useState(0)
  const controls = useRef<ReturnType<typeof animate>[]>([])

  const topProgress = useMotionValue(0)
  const bottomProgress = useMotionValue(0)
  const topWidth = useTransform(topProgress, (v) => STROKE_TOP.startW + v * (STROKE_TOP.w - STROKE_TOP.startW))
  const bottomWidth = useTransform(bottomProgress, (v) => STROKE_BOTTOM.startW + v * (STROKE_BOTTOM.w - STROKE_BOTTOM.startW))

  const sweep = useCallback(() => {
    controls.current.forEach((c) => c.stop())
    if (reduceMotion) {
      topProgress.set(1)
      bottomProgress.set(1)
      return
    }
    topProgress.set(0)
    bottomProgress.set(0)
    controls.current = [
      animate(topProgress, 1, { duration: SWEEP_DURATION, ease: SWEEP_EASE }),
      animate(bottomProgress, 1, { duration: SWEEP_DURATION, ease: SWEEP_EASE, delay: SWEEP_STAGGER }),
    ]
  }, [reduceMotion, topProgress, bottomProgress])

  useEffect(() => {
    sweep()
    const active = controls.current
    return () => active.forEach((c) => c.stop())
  }, [sweep])

  const restyle = () => {
    setColorIndex((i) => (i + 1) % MARKER_COUNT)
    sweep()
  }

  const strokes = [
    { key: 'top', stroke: STROKE_TOP, width: topWidth },
    { key: 'bottom', stroke: STROKE_BOTTOM, width: bottomWidth },
  ]

  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      role="img"
      aria-label="thatguyabhishek"
      onMouseEnter={restyle}
      onClick={restyle}
      style={{ '--marker': `var(--marker-${colorIndex})` } as React.CSSProperties}
      className={`h-12 w-auto text-fg ${className}`}
    >
      <defs>
        {strokes.map(({ key, stroke, width }) => (
          <g key={key}>
            <clipPath id={`${uid}-shape-${key}`}>
              <path d={stroke.path} transform={`translate(${stroke.x} ${stroke.y})`} />
            </clipPath>
            <clipPath id={`${uid}-sweep-${key}`}>
              <motion.rect x={stroke.x} y={stroke.y - 2} width={width} height={stroke.h + 4} />
            </clipPath>
          </g>
        ))}
      </defs>

      {strokes.map(({ key, stroke }) => (
        <g key={key} clipPath={`url(#${uid}-shape-${key})`}>
          <rect
            x={stroke.x}
            y={stroke.y}
            width={stroke.w}
            height={stroke.h}
            clipPath={`url(#${uid}-sweep-${key})`}
            className="fill-[var(--marker)] transition-[fill] duration-300"
          />
        </g>
      ))}

      <Wordmark className="fill-current" />

      {/* Ink copy of the wordmark, visible only where the marker has been laid down */}
      {strokes.map(({ key }) => (
        <g key={key} clipPath={`url(#${uid}-shape-${key})`}>
          <g clipPath={`url(#${uid}-sweep-${key})`}>
            <Wordmark className="fill-[var(--logo-ink)]" />
          </g>
        </g>
      ))}
    </svg>
  )
}
