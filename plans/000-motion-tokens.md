# 000 — Introduce shared easing & duration tokens

- **Status**: TODO
- **Commit**: d51a29a
- **Severity**: HIGH (foundation — every other plan depends on it)
- **Category**: Cohesion & tokens
- **Estimated scope**: 2 files (`app/globals.css`, `tailwind.config.js`), ~15 lines

## Problem

The repo has no shared easing/duration vocabulary. Motion is hand-typed:

- `tailwind.config.js:74` defines exactly one token — `'froala': 'cubic-bezier(0.4, 0, 0.2, 1)'` — but it's a weak Material-style curve and nothing in the app actually uses it (grep for `ease-froala` → zero hits).
- `app/globals.css:123` — `.slide-up { animation: slideUp 0.5s ease-out forwards; }` uses bare `ease-out`, which is the weak built-in curve, not a designed one.
- `components/ActressCard.tsx:54` — `hover:-translate-y-1 transition-all duration-300` uses `transition: all` (a performance finding by itself) with Tailwind's default easing.
- `components/VoteButton.tsx:78` — `transition-all duration-200` again.

Consequence: every future motion plan would have to inline a raw `cubic-bezier(...)`, and the app has no consistent feel.

```js
// tailwind.config.js:73-75 — current
transitionTimingFunction: {
  'froala': 'cubic-bezier(0.4, 0, 0.2, 1)',
},
```

```css
/* app/globals.css:122-133 — current */
.slide-up {
  animation: slideUp 0.5s ease-out forwards;
  opacity: 0;
  transform: translateY(20px);
}

@keyframes slideUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

## Target

Three named easing tokens + three duration tokens, exposed as CSS variables **and** as Tailwind utilities (Tailwind arbitrary values `[var(--ease-out)]` already work, but named utilities read better in components).

```css
/* app/globals.css :root additions */
:root {
  /* ...existing color vars... */

  /* Motion tokens */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);        /* strong ease-out for UI entrances & exits */
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);    /* on-screen morph / reposition */
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);     /* iOS-style drawer / sheet */

  --duration-fast: 160ms;   /* press feedback */
  --duration-base: 200ms;   /* dropdowns, hover states */
  --duration-slow: 300ms;   /* enter/exit, stagger cell */
}
```

```js
// tailwind.config.js
transitionTimingFunction: {
  out: 'cubic-bezier(0.23, 1, 0.32, 1)',
  'in-out': 'cubic-bezier(0.77, 0, 0.175, 1)',
  drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
  // keep 'froala' as an alias for backward compat during migration
  froala: 'cubic-bezier(0.4, 0, 0.2, 1)',
},
transitionDuration: {
  fast: '160ms',
  base: '200ms',
  slow: '300ms',
},
```

## Repo conventions to follow

- CSS variables live under `:root {}` in `app/globals.css:169-183` — add the new motion tokens in the same block, right after the color mappings.
- Tailwind's `theme.extend` in `tailwind.config.js:18` — extend, don't replace.
- Naming: use short semantic names (`out`, `drawer`) — matches the repo's terse Tailwind class style (`fdb-btn`, `bg-bg-secondary`).

## Steps

1. **Edit `app/globals.css`**: inside the existing `@layer base { :root { … } }` block starting at line 169, append the six motion tokens shown in the Target section. Do NOT create a new `:root` block.

2. **Edit `tailwind.config.js`**: replace the current `transitionTimingFunction` object (line 73-75) with the four-key version in Target, and add the new `transitionDuration` object right after it. Keep everything else in `theme.extend` untouched.

3. **Sanity-migrate the two obvious sites** (do NOT touch anything else — later plans handle their own migrations):
   - `app/globals.css:123` — change `animation: slideUp 0.5s ease-out forwards;` to `animation: slideUp var(--duration-slow) var(--ease-out) forwards;`
   - `app/globals.css:137` — change `animation: fadeIn 0.4s ease-out forwards;` to `animation: fadeIn var(--duration-slow) var(--ease-out) forwards;`

## Boundaries

- Do NOT rename or delete the existing `froala` easing key — other components may still reference it via `ease-froala`; keep it as an alias.
- Do NOT touch `components/`, `app/HomeClient.tsx`, or any `.tsx` file. This plan is CSS + Tailwind config only.
- Do NOT introduce a motion library (no framer-motion / motion install). Later plans decide whether that's warranted.
- If the CSS variables you add cause a Tailwind rebuild error (unlikely — they're plain custom props), STOP and report.

## Verification

- **Mechanical**:
  - `npm run lint` — expect zero new errors.
  - `npm run build` — expect success; a Tailwind rebuild will emit the new utilities `ease-out`, `ease-in-out`, `ease-drawer`, `duration-fast`, `duration-base`, `duration-slow`.
  - `grep -r "var(--ease-out)" app/` — expect at least one hit (line 123).
- **Feel check**: reload homepage. The `.slide-up` grid entrance on `HomeClient.tsx:386` should feel **slightly snappier and more decisive** — the new `ease-out` curve reaches the end state faster than the built-in one. If it feels the same, the token wasn't wired; check for CSS variable typos.
- **Done when**: `ease-out`, `ease-in-out`, `ease-drawer`, `duration-fast`, `duration-base`, `duration-slow` are all valid Tailwind utilities AND the two `slide-up`/`fade-in` keyframe animations reference the new CSS vars.
