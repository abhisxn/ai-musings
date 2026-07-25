/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './content/**/*.{js,ts,jsx,tsx}',
    './experiments/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        fg: 'var(--color-fg)',
        accent: 'var(--color-accent)',
        secondary: 'var(--color-secondary)',
        'surface-1': 'var(--color-surface-1)',
        'surface-2': 'var(--color-surface-2)',
        'surface-3': 'var(--color-surface-3)',
        'border-1': 'var(--color-border-1)',
        'border-2': 'var(--color-border-2)',
        success: {
          DEFAULT: 'var(--color-success)',
          bg: 'var(--color-success-bg)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          bg: 'var(--color-warning-bg)',
        },
        error: {
          DEFAULT: 'var(--color-error)',
          bg: 'var(--color-error-bg)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          bg: 'var(--color-info-bg)',
        },
      },
      fontFamily: {
        display: ['var(--font-glory)', 'serif'],
        body: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        btn: 'var(--radius-btn)',
        card: 'var(--radius-card)',
        pill: 'var(--radius-pill)',
      },
    },
  },
  plugins: [],
}
