'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

const RESUME_URL =
  'https://drive.google.com/file/d/1QuxjEMB-PyVbgwsjjPpacY3xJ3j8eXMU/view?usp=drive_link'

const PORTFOLIO_URL = 'https://thatguyabhishek.com'

const NAV_LINKS = [
  { label: 'About', href: `${PORTFOLIO_URL}/about` },
  { label: 'Work', href: `${PORTFOLIO_URL}/work` },
  { label: 'Awards', href: `${PORTFOLIO_URL}/awards` },
  { label: 'AI Musings', href: '/' },
  { label: 'Contact', href: `${PORTFOLIO_URL}/contact` },
]

function ArrowIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M1.5 10.5L10.5 1.5M10.5 1.5H4.5M10.5 1.5V7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-all duration-300"
      style={
        scrolled
          ? {
              background: 'color-mix(in srgb, var(--color-bg) 70%, transparent)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderBottom: '1px solid var(--color-border-1)',
            }
          : {
              background: 'transparent',
              borderBottom: '1px solid transparent',
            }
      }
    >
      <div className="max-w-[1200px] mx-auto px-6 sm:px-10 lg:px-16 h-16 flex items-center justify-between">
        <Link
          href={PORTFOLIO_URL}
          className="flex items-center hover:opacity-70 transition-opacity duration-200"
        >
          <Image
            src="/logo.svg"
            alt="thatguyabhishek"
            width={118}
            height={50}
            className="h-12 w-auto"
            priority
          />
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          <nav className="flex items-center gap-7">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="t-body2 text-fg/70 relative transition-colors duration-200 after:absolute after:left-0 after:-bottom-0.5 after:h-px after:w-0 after:bg-current after:transition-all after:duration-200 hover:text-fg hover:after:w-full"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <a
            href={RESUME_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 pl-5 pr-3 py-3 rounded-full font-medium text-sm border border-fg/30 text-fg hover:bg-fg hover:text-bg transition-colors duration-200"
          >
            Get my resumé
            <ArrowIcon size={14} />
          </a>
          <ThemeToggle />
        </div>

        {/* Mobile */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
            className="flex flex-col justify-center gap-[4px] w-8 h-8"
          >
            <span
              className={`block h-px transition-all duration-300 origin-center ${open ? 'w-5 translate-y-2 rotate-45' : 'w-5'}`}
              style={{ backgroundColor: 'var(--color-fg)' }}
            />
            <span
              className={`block h-px transition-all duration-300 ${open ? 'w-0 opacity-0' : 'w-4'}`}
              style={{ backgroundColor: 'var(--color-fg)' }}
            />
            <span
              className={`block h-px transition-all duration-300 origin-center ${open ? 'w-5 -translate-y-2 -rotate-45' : 'w-5'}`}
              style={{ backgroundColor: 'var(--color-fg)' }}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-72 opacity-100' : 'max-h-0 opacity-0'}`}
        style={{
          background: 'color-mix(in srgb, var(--color-bg) 92%, transparent)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid var(--color-border-1)',
        }}
      >
        <nav className="flex flex-col px-6 py-5 gap-5">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="t-body2 text-fg/70 transition-colors hover:underline"
            >
              {link.label}
            </Link>
          ))}
          <a
            href={RESUME_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 self-start pl-5 pr-3 py-3 rounded-full font-medium text-sm border border-fg/30 text-fg hover:bg-fg hover:text-bg transition-colors duration-200"
          >
            Get my resumé
            <ArrowIcon size={14} />
          </a>
        </nav>
      </div>
    </header>
  )
}
