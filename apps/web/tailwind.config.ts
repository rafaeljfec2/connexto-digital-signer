import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          900: 'var(--color-brand-900)',
          700: 'var(--color-brand-700)',
          500: 'var(--color-brand-500)',
          300: 'var(--color-brand-300)',
        },
        accent: {
          600: 'var(--color-accent-600)',
          400: 'var(--color-accent-400)',
          200: 'var(--color-accent-200)',
          DEFAULT: 'var(--color-accent)',
          foreground: 'var(--color-accent-foreground)',
        },
        neutral: {
          900: 'var(--color-neutral-900)',
          700: 'var(--color-neutral-700)',
          500: 'var(--color-neutral-500)',
          300: 'var(--color-neutral-300)',
          100: 'var(--color-neutral-100)',
          50: 'var(--color-neutral-50)',
        },
        primary: {
          DEFAULT: 'var(--color-primary)',
          foreground: 'var(--color-primary-foreground)',
        },
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        'surface-glass': 'var(--color-surface-glass)',
        'surface-card': 'var(--color-surface-card)',
        text: 'var(--color-text)',
        muted: 'var(--color-text-muted)',
        border: 'var(--color-border)',
        destructive: 'var(--color-destructive)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        foreground: 'var(--th-fg)',
        'foreground-muted': 'var(--th-fg-muted)',
        'foreground-subtle': 'var(--th-fg-subtle)',
        'th-page': 'var(--th-page-bg)',
        'th-sidebar': 'var(--th-sidebar-bg)',
        'th-header': 'var(--th-header-bg)',
        'th-card': 'var(--th-card-bg)',
        'th-card-border': 'var(--th-card-border)',
        'th-border': 'var(--th-border)',
        'th-hover': 'var(--th-hover-bg)',
        'th-input': 'var(--th-input-bg)',
        'th-input-border': 'var(--th-input-border)',
        'th-overlay': 'var(--th-overlay)',
        'th-dialog': 'var(--th-dialog-bg)',
        'th-icon-bg': 'var(--th-icon-bg)',
        'th-icon-fg': 'var(--th-icon-fg)',
        'th-active': 'var(--th-active-bg)',
        'th-active-text': 'var(--th-active-text)',
        'th-header-border': 'var(--th-header-border)',
      },
      backgroundImage: {
        'gradient-main': 'var(--gradient-main)',
        'gradient-cta': 'var(--gradient-cta)',
      },
      boxShadow: {
        'th-card': 'var(--th-card-shadow)',
      },
    },
  },
  plugins: [],
};

export default config;
