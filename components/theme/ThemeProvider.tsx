'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { MotionConfig } from 'framer-motion'
import type { ReactNode } from 'react'

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="musings-theme"
    >
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </NextThemesProvider>
  )
}
