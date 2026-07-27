import Link from 'next/link'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

export function Nav() {
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
          href="/"
          className="font-display text-base sm:text-lg tracking-tight text-fg hover:text-accent transition-colors rounded-btn focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          AI&nbsp;<span className="text-accent">Musings</span>
        </Link>

        <ThemeToggle />
      </nav>
    </header>
  )
}
