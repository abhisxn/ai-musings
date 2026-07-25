'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { fadeUp, stagger } from '@/lib/motion'

const NAV_LINKS = [{ href: '/experiments', label: 'Experiments' }]

export function Nav() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed top-0 inset-x-0 z-40 flex justify-center pt-4 sm:pt-6 px-4">
      <nav
        className="w-full max-w-3xl mx-auto flex items-center justify-between gap-3
                   px-4 sm:px-5 py-2
                   rounded-pill
                   bg-surface-1 backdrop-blur-xl backdrop-saturate-150
                   border border-border-1
                   shadow-[0_8px_32px_rgba(0,0,0,0.18)]"
        aria-label="Primary"
      >
        <Link
          href="/experiments"
          className="font-display text-base sm:text-lg tracking-tight text-fg hover:text-accent transition-colors"
        >
          AI&nbsp;<span className="text-accent">Musings</span>
        </Link>

        <ul className="hidden sm:flex items-center gap-1 text-t-body3">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="px-3 py-1.5 rounded-pill text-fg/80 hover:text-fg hover:bg-surface-2 transition-colors"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="sm:hidden w-9 h-9 inline-flex items-center justify-center rounded-btn text-fg hover:text-accent transition-colors"
          >
            <motion.span
              animate={{ rotate: open ? 45 : 0, y: open ? 0 : -4 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="block w-4 h-0.5 bg-current"
            />
            <motion.span
              animate={{ rotate: open ? -45 : 0, y: open ? -4 : 4 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="absolute block w-4 h-0.5 bg-current"
            />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.ul
            key="mobile-menu"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={stagger}
            className="sm:hidden absolute top-[calc(100%+0.5rem)] left-4 right-4 mx-auto
                       max-w-3xl
                       p-3 flex flex-col gap-1
                       rounded-card
                       bg-surface-2 backdrop-blur-xl border border-border-1
                       shadow-[0_8px_32px_rgba(0,0,0,0.22)]"
          >
            {NAV_LINKS.map((l) => (
              <motion.li key={l.href} variants={fadeUp}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 rounded-btn text-fg/90 hover:text-fg hover:bg-surface-3 transition-colors font-display"
                >
                  {l.label}
                </Link>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </header>
  )
}
