/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#e94560',
        'primary-dark': '#c73e54',
        secondary: '#f5f5f5',
        accent: '#e94560',
        'text-primary': '#333333',
        'text-secondary': '#888888',
        success: '#4caf50',
        border: '#f0f0f0',
      },
      fontFamily: {
        japanese: ['"Noto Sans JP"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}