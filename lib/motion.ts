import type { Variants } from 'framer-motion'

export const fadeUp: Variants = {
  hidden: {
    opacity: 0,
    y: 32,
    filter: 'blur(16px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

export const stagger: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

export const viewport = {
  once: true,
  margin: '-80px',
} as const
