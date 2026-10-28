/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
