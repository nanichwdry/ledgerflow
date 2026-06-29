import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F6F3EA',
        surface: '#FBF9F2',
        ink: '#15261F',
        'ink-soft': '#46594D',
        rule: '#D8D0B4',
        'rule-strong': '#B7AD86',
        brass: '#A8823C',
        'brass-dark': '#8A6A2C',
        debit: '#8B3232',
        credit: '#2F5D44',
        panel: '#14201C',
        'panel-soft': '#1D2B25',
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'serif'],
        body: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-plex-mono)', 'monospace'],
      },
      boxShadow: {
        ledger: '0 1px 0 0 rgba(21,38,31,0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
