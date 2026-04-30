import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Musings',
  description: 'Interactive AI + creative experiments by Abhishek Saxena',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-screen">
        <div className="hud-overlay" />
        <div className="hud-scanline" />
        <div className="vignette" />
        <main className="relative z-10">{children}</main>
      </body>
    </html>
  )
}
