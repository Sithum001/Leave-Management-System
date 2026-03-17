/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Clash Display', 'Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d7fe',
          300: '#a5b8fc',
          400: '#818cf8',
          500: '#3b5bdb',
          600: '#2f4ac0',
          700: '#253ba0',
          800: '#1e2f7d',
          900: '#192362',
        },
        slate: {
          850: '#1a2035',
          950: '#0d1117',
        }
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'card-hover': '0 4px 20px -4px rgb(59 91 219 / 0.15)',
        'glow': '0 0 30px rgb(59 91 219 / 0.2)',
      }
    },
  },
  plugins: [],
}