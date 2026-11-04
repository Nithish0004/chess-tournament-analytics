/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nearblack: '#0b0b0c',
        carddark: '#131314',
        dark: {
          bg: '#0f0f10',
          landingBg: '#0b0b0c',
          surface: '#161617',
          card: '#161617',
          cardSurface: '#131314',
          elevated: '#1c1c1e',
          sidebar: '#141415',
          border: '#262628',
          borderLight: '#2e2e30',
          muted: '#38383a'
        },
        gold: {
          DEFAULT: '#e8c27a',
          light: '#f5d898',
          dark: '#c9993f',
          from: '#e8c27a',
          to: '#c9993f',
          50: '#FDF9F0',
          100: '#FBF2E0',
          200: '#F5E3BD',
          300: '#ECD096',
          400: '#E8C27A',
          500: '#C6A15B',
          600: '#B08B45',
          700: '#8F6E30',
          line: 'rgba(232, 194, 122, 0.18)',
          glow: 'rgba(232, 194, 122, 0.25)',
        },
        chess: {
          50: '#f6f7f9',
          100: '#edeef2',
          200: '#d7dae2',
          300: '#b4bacb',
          400: '#8b95af',
          500: '#6c7797',
          600: '#56607e',
          700: '#464e67',
          800: '#3c4257',
          900: '#232734',
          950: '#141720',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Cormorant Garamond', 'Georgia', 'serif'],
        condensed: ['Barlow Condensed', 'Oswald', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '1.75rem',
      }
    },
  },
  plugins: [],
}
