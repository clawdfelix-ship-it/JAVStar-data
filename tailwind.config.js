/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary Colors - Soft Pink Theme
        primary: {
          DEFAULT: '#F472B6',
          light: '#F9A8D4',
          dark: '#EC4899',
        },
        // Background Colors
        bg: {
          primary: '#FFFFFF',
          secondary: '#FDF2F8',
          tertiary: '#FCE7F3',
          dark: '#1D2129',
        },
        // Text Colors
        text: {
          primary: '#1D2129',
          secondary: '#4E5969',
          tertiary: '#86909C',
          placeholder: '#C9CDD4',
          white: '#FFFFFF',
        },
        // Accent Colors
        accent: '#EC4899',
        success: '#00B42A',
        warning: '#FF7D00',
        danger: '#F53F3F',
        purple: '#A855F7',
        // Border Colors
        border: {
          DEFAULT: '#FBCFE8',
          light: '#FCE7F3',
          dark: '#F9A8D4',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'sans-serif'],
        mono: ['SF Mono', 'Menlo', 'Monaco', 'monospace'],
        japanese: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'Hiragino Kaku Gothic ProN', 'sans-serif'],
      },
      borderRadius: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
      },
      boxShadow: {
        'xs': '0 1px 2px rgba(236, 72, 153, 0.03)',
        'sm': '0 2px 8px rgba(236, 72, 153, 0.06)',
        'md': '0 4px 16px rgba(236, 72, 153, 0.08)',
        'lg': '0 8px 24px rgba(236, 72, 153, 0.12)',
        'xl': '0 16px 48px rgba(236, 72, 153, 0.16)',
        'card': '0 2px 12px rgba(236, 72, 153, 0.04)',
        'card-hover': '0 8px 30px rgba(236, 72, 153, 0.10)',
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
      },
      transitionTimingFunction: {
        'froala': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
