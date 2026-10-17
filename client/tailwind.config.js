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
          dark: '#070d1e',
          navy: '#0c1938',
          sidebar: '#0a142f',
          surface: '#11224d',
          primary: '#2563eb',
          'primary-hover': '#1d4ed8',
          'primary-light': '#eff6ff',
          accent: '#38bdf8',
          orange: '#f97316',
          text: '#0f172a',
          muted: '#64748b',
          border: '#e2e8f0',
          bg: '#f8fafc',
          card: '#ffffff',
        },
        status: {
          paid: '#10b981',
          'paid-bg': '#ecfdf5',
          'paid-text': '#047857',
          pending: '#f59e0b',
          'pending-bg': '#fffbeb',
          'pending-text': '#b45309',
          overdue: '#f43f5e',
          'overdue-bg': '#fff1f2',
          'overdue-text': '#be123c',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 10px 25px -5px rgba(37, 99, 235, 0.08), 0 8px 10px -6px rgba(37, 99, 235, 0.04)',
        'modal': '0 25px 50px -12px rgba(12, 25, 56, 0.25)',
      }
    },
  },
  plugins: [],
}
