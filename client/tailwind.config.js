/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#101010',
          sidebar: '#171717',
          card: '#202020',
          elevated: '#262626',
          border: '#303030',
          muted: '#383838'
        },
        gold: {
          DEFAULT: '#C6A15B',
          light: '#DFB86C',
          dark: '#A4823E',
          50: '#FDF9F0',
          100: '#FBF2E0',
          500: '#C6A15B',
          600: '#B08B45',
          700: '#8F6E30'
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
      }
    },
  },
  plugins: [],
}
