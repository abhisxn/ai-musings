import Link from 'next/link'

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="mt-24 mb-6 px-4 flex justify-center">
      <div
        className="w-full max-w-3xl mx-auto
                   px-5 py-3
                   rounded-pill
                   bg-surface-1 backdrop-blur-xl backdrop-saturate-150
                   border border-border-1
                   flex items-center justify-between gap-3
                   t-caption text-fg/60"
      >
        <span>
          © {year} Abhishek Saxena
        </span>
        <Link
          href="/experiments"
          className="hover:text-accent transition-colors"
        >
          AI Musings
        </Link>
      </div>
    </footer>
  )
}
