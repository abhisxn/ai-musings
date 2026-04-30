/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './content/**/*.{js,ts,jsx,tsx}',
    './experiments/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        void: {
          black: '#000000',
          dark: '#050505',
          surface: '#0a0a0a',
        },
        neon: {
          green: '#00ff00',
          amber: '#ffae00',
          cyan: '#00ffff',
          magenta: '#ff00ff',
        },
        artifact: {
          white: '#f5f5f5',
          paper: '#ffffff',
          ink: '#000000',
        }
      },
      fontFamily: {
        mono: ['Share Tech Mono', 'monospace'],
        system: ['Courier New', 'Courier', 'monospace'],
      },
      animation: {
        'glitch-slow': 'glitch 3s infinite linear alternate-reverse',
        'glitch-fast': 'glitch 1s infinite linear alternate-reverse',
        'scanline': 'scanline 10s linear infinite',
        'pulse-fast': 'pulse 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        glitch: {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
          '100%': { transform: 'translate(0)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        }
      },
    },
  },
  plugins: [],
}
