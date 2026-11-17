/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 950: '#071E45', 900: '#0A2456', 800: '#102F6B', 700: '#17409A' },
        brand: { 500: '#2056E0', 600: '#1A56DB', 100: '#E8EEFD' },
        bg: '#F3F6FB'
      },
      boxShadow: { card: '0 8px 24px rgba(10,36,86,.08)' }
    }
  },
  plugins: []
}