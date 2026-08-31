/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // NIPPON COLORS - 日本傳統配色
        sakura: 'rgb(var(--color-sakura))',
        nadeshiko: {
          DEFAULT: 'rgb(var(--color-nadeshiko))',
          dark: 'rgb(var(--color-nadeshiko-dark))',
          strong: 'rgb(var(--color-nadeshiko-strong))',
          light: 'rgb(var(--color-nadeshiko-light))',
        },
        'sakura-gray': 'rgb(var(--color-sakura-gray))',
        kamenozoki: {
          DEFAULT: 'rgb(var(--color-kamenozoki))',
          dark: 'rgb(var(--color-kamenozoki-dark))',
        },
        umenezumi: {
          DEFAULT: 'rgb(var(--color-umenezumi))',
          light: 'rgb(var(--color-umenezumi-light))',
          lighter: 'rgb(var(--color-umenezumi-lighter))',
        },
        shiro: 'rgb(var(--color-shiro))',
        
        // Legacy mappings (for backward compatibility)
        primary: {
          DEFAULT: 'rgb(var(--color-nadeshiko-dark))',
          light: 'rgb(var(--color-nadeshiko))',
          lighter: 'rgb(var(--color-nadeshiko-light))',
        },
        secondary: {
          DEFAULT: 'rgb(var(--color-kamenozoki-dark))',
          light: 'rgb(var(--color-kamenozoki))',
        },
        border: {
          DEFAULT: 'rgba(var(--color-sakura-gray), 0.6)',
          dark: 'rgb(var(--color-sakura-gray))',
        },
        bg: {
          secondary: 'rgb(var(--color-sakura))',
          tertiary: 'rgba(var(--color-sakura-gray), 0.3)',
        },
        text: {
          primary: 'rgb(var(--color-umenezumi))',
          secondary: 'rgb(var(--color-umenezumi-light))',
          tertiary: 'rgb(var(--color-umenezumi-lighter))',
        },
        danger: '#ef4444',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        'froala': '0 4px 20px rgba(236, 72, 153, 0.1)',
        'froala-lg': '0 8px 30px rgba(236, 72, 153, 0.15)',
      },
      transitionTimingFunction: {
        'out': 'cubic-bezier(0.23, 1, 0.32, 1)',
        'in-out': 'cubic-bezier(0.77, 0, 0.175, 1)',
        'drawer': 'cubic-bezier(0.32, 0.72, 0, 1)',
        'froala': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        'fast': '160ms',
        'base': '200ms',
        'slow': '300ms',
      },
    },
  },
  plugins: [],
}
