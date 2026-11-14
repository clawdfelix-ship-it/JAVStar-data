'use client';

import { Theme, defineTheme } from '@astryxdesign/core';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
import './astryx-tailwind-shim.css';
import type { ReactNode } from 'react';

// JCHING nadeshiko/sakura mapped onto Astryx tokens.
// Flat light values (not [light,dark] tuples): tuples compile to light-dark(),
// which only resolves when color-scheme is set and otherwise falls back to grey.
export const adminTheme = defineTheme({
  name: 'jching-admin',
  tokens: {
    '--color-accent': '#ec6aa0',
    '--color-accent-muted': '#f8c9dc',
    '--color-background-surface': '#fff7fb',
    '--color-background-body': '#fdf2f7',
    '--color-background-card': '#ffffff',
    '--color-text-primary': '#35202b',
    '--color-text-secondary': '#6d4a58',
    '--radius-container': '14px',
  },
});

// Shared Astryx surface for every admin module. The Theme sets
// data-astryx-theme on <html>, which the Tailwind shim is scoped to, so the
// public (non-admin) Tailwind site is never affected.
export function AstryxShell({ children }: { children: ReactNode }) {
  return (
    <Theme theme={adminTheme} mode="light">
      {children}
    </Theme>
  );
}
