/** @type {import('tailwindcss').Config} */

// Every colour is a CSS variable (src/index.css) holding an "r g b" triplet, so opacity
// modifiers work: bg-accent/10, border-line/60.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: token('canvas'),
        surface: { DEFAULT: token('surface'), 2: token('surface-2'), 3: token('surface-3') },
        line: { DEFAULT: token('line'), strong: token('line-strong') },
        fg: { DEFAULT: token('fg'), muted: token('fg-muted'), subtle: token('fg-subtle') },
        accent: { DEFAULT: token('accent'), strong: token('accent-strong'), ink: token('accent-ink') },
        // Meaning, not decoration: sage = verified / ready, coral = gap / needs work,
        // ember = error / blocked, iris = goal / future, azure = information.
        sage: token('sage'),
        coral: token('coral'),
        ember: token('ember'),
        iris: token('iris'),
        azure: token('azure'),
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: 'inset 0 1px 0 0 rgb(255 240 214 / 0.035), 0 10px 30px -18px rgb(0 0 0 / 0.75)',
        pop: 'inset 0 1px 0 0 rgb(255 240 214 / 0.05), 0 30px 70px -30px rgb(0 0 0 / 0.85)',
        glow: '0 0 0 1px rgb(var(--accent) / 0.35), 0 18px 50px -20px rgb(var(--accent) / 0.45)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        rise: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        sweep: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        rise: 'rise 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) both',
        sweep: 'sweep 2.4s linear infinite',
      },
    },
  },
  plugins: [],
};
