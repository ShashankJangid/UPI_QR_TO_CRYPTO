/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          900: '#064e3b',
        },
        upi: {
          DEFAULT: '#5f259f',
          light: '#7d38cc',
        },
        tether: {
          DEFAULT: '#26A17B',
          light: '#2cd09e',
        }
      }
    },
  },
  plugins: [],
}
