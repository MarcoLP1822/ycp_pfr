/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        mocha: {
          DEFAULT: '#837060',   // Base mocha color
          light: '#A99E8A',     // Lighter variant for backgrounds or highlights
          dark: '#584338'       // Darker variant for text or accents
        }
      }
    },
  },
  plugins: [],
}
