/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0a0f',
          surface: '#12121a',
          elevated: '#1a1a26',
          border: '#252535',
        },
        brand: {
          DEFAULT: '#6c63ff',
          light: '#8b85ff',
          dark: '#4d45cc',
          glow: 'rgba(108, 99, 255, 0.3)',
        },
        accent: {
          cyan: '#00d4ff',
          green: '#00e5a0',
          orange: '#ff6b35',
          pink: '#ff4d8b',
          yellow: '#ffd93d',
        },
        text: {
          primary: '#f0f0f8',
          secondary: '#9090b0',
          muted: '#606080',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #6c63ff 0%, #00d4ff 100%)',
        'gradient-surface': 'linear-gradient(180deg, #1a1a26 0%, #12121a 100%)',
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0z' fill='none'/%3E%3Cpath d='M0 40V0M40 0v40' stroke='%23252535' stroke-width='0.5'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        'glow-brand': '0 0 30px rgba(108, 99, 255, 0.2)',
        'glow-cyan': '0 0 30px rgba(0, 212, 255, 0.2)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
