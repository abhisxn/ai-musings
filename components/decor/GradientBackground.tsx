'use client'

import { useEffect, useRef, useState } from 'react'

/*
 * Ported from thatguyabhishek.com's GradientBackground: blobs drift toward a
 * random offset on mousemove instead of auto-animating, each with its own
 * cooldown so they desync and never all move in lockstep.
 */

const BLOBS = [
  { color: 'var(--color-accent)', w: '70vw', h: '70vh', left: '-10vw', top: '-15vh' },
  { color: 'var(--color-secondary)', w: '65vw', h: '65vh', left: '35vw', top: '10vh' },
  { color: '#c04e24', w: '55vw', h: '55vh', left: '10vw', top: '30vh' },
]

const COOLDOWNS = [2000, 3000, 2500]

export function GradientBackground() {
  const [mounted, setMounted] = useState(false)
  const wrapperRefs = useRef<(HTMLDivElement | null)[]>([])
  const driftReady = useRef([true, true, true])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    wrapperRefs.current.forEach((el, i) => {
      if (!el) return
      const dur = 2.5 + i * 0.6 + Math.random() * 1.5
      el.style.transition = `transform ${dur}s cubic-bezier(0.2, 0.8, 0.3, 1)`
    })

    let movePending = false

    const onMove = () => {
      if (movePending) return
      movePending = true
      requestAnimationFrame(() => {
        movePending = false
        wrapperRefs.current.forEach((el, i) => {
          if (!el || !driftReady.current[i]) return
          driftReady.current[i] = false

          const sx = Math.random() < 0.5 ? 1 : -1
          const sy = Math.random() < 0.5 ? 1 : -1
          const rx = sx * (80 + Math.random() * 260)
          const ry = sy * (80 + Math.random() * 220)
          el.style.transform = `translate3d(${rx}px, ${ry}px, 0)`

          const base = COOLDOWNS[i]
          setTimeout(() => {
            driftReady.current[i] = true
          }, base + Math.random() * 2000)
        })
      })
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [mounted])

  if (!mounted) return null

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {BLOBS.map((blob, i) => (
        <div
          key={i}
          ref={(el) => {
            wrapperRefs.current[i] = el
          }}
          style={{
            position: 'absolute',
            width: blob.w,
            height: blob.h,
            left: blob.left,
            top: blob.top,
            willChange: 'transform',
          }}
        >
          <div
            className="gb-blob"
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: `radial-gradient(ellipse at center, color-mix(in srgb, ${blob.color} calc(var(--blob-alpha) * 100%), transparent) 0%, transparent 65%)`,
              filter: 'blur(90px)',
            }}
          />
        </div>
      ))}
      <style>{`
        .gb-blob {
          --blob-alpha: 1;
        }
        [data-theme="light"] .gb-blob {
          --blob-alpha: 0.6;
        }
        @media (prefers-reduced-motion: reduce) {
          .gb-blob {
            transform: none !important;
          }
        }
      `}</style>
    </div>
  )
}
