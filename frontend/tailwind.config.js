/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        green:  { DEFAULT: '#1B4D2E', mid: '#2D7A47', light: '#52A870' },
        mango:  { DEFAULT: '#F59E0B', dark: '#B45309', pale: '#FFFBEB' },
        cream:  '#FEFAF3',
        warm:   '#FEF3C7',
      },
      fontFamily: {
        sans:   ['Plus Jakarta Sans', 'sans-serif'],
        serif:  ['Fraunces', 'serif'],
      },
    },
  },
  plugins: [],
}
