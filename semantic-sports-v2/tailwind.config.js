/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        pl: {
          purple: '#38003c',
          green:  '#00ff85',
          light:  '#e90052',
        },
        laliga: {
          red:  '#c8102e',
          gold: '#f5a623',
        },
        nba: {
          navy: '#1d428a',
          gold: '#ffc72c',
        },
        cricket: {
          blue:   '#004c91',
          orange: '#ff6b35',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
