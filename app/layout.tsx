import type { Metadata } from 'next'
import { Glory, Manrope } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { GrainOverlay } from '@/components/decor/GrainOverlay'

const glory = Glory({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-glory',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AI Musings',
  description: 'Interactive AI + creative experiments by Abhishek Saxena',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${glory.variable} ${manrope.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased min-h-screen bg-bg text-fg font-body">
        <ThemeProvider>
          <GrainOverlay />
          <main className="relative z-10">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  )
}
