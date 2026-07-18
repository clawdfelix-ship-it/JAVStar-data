# 002 — ActressCard: replace hover-only with hover + press, kill `transition-all`

- **Status**: TODO
- **Commit**: d51a29a
- **Severity**: HIGH (12 cards on every homepage render, hit constantly)
- **Category**: Easing & duration + Performance + Accessibility
- **Estimated scope**: 1 file, ~5 line changes
- **Depends on**: 000-motion-tokens

## Problem

Grid cards use `transition-all` (a §5 finding), a bare `duration-300`, and hover-only feedback that mobile users never see.

```tsx
// components/ActressCard.tsx:54 — current
<div className="relative bg-white rounded-xl border border-[rgba(var(--color-sakura-gray),0.6)] shadow-md overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
```

```tsx
// components/ActressCard.tsx:72 — current
<img
  ...
  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
/>
```

Problems:
- `transition-all` animates paint-triggering properties (background, filters, box-shadow inner spread) off-GPU.
- `duration-300` + default Tailwind easing on hover is fine on desktop but **hover doesn't fire on mobile** — half the audience gets zero feedback.
- Avatar `duration-500` group-hover scale is decorative and adds 200ms lag past the outer card's motion.

## Target

```tsx
// target — outer card
<div
  className="relative bg-white rounded-xl border border-[rgba(var(--color-sakura-gray),0.6)]
    shadow-md overflow-hidden
    transition-[transform,box-shadow] duration-base ease-out
    active:scale-[0.98] active:translate-y-[-2px]
    md:hover:shadow-xl md:hover:-translate-y-1
    group"
>
```

```tsx
// target — avatar img
<img
  ...
  className="w-full h-full object-cover
    transition-transform duration-slow ease-out
    md:group-hover:scale-105"
/>
```

Key changes:
1. `transition-all` → `transition-[transform,box-shadow]` (only GPU-friendly).
2. Hover gated behind Tailwind's `md:` breakpoint (Tailwind's native way of restricting to non-touch) so mobile doesn't fire ghost hovers on tap.
3. Add `active:scale-[0.98] active:translate-y-[-2px]` — press feedback that works on both touch and mouse.
4. Avatar `duration-500` → `duration-slow` (300ms) to match card timing.
5. Explicit `ease-out` — was implicit weak curve, now the strong AUDIT curve via token.

## Repo conventions to follow

- Tailwind arbitrary values with brackets: `active:scale-[0.98]` — matches `hover:-translate-y-1` style already in file at line 54.
- Named easing utility `ease-out` — introduced in plan 000.
- The `md:` gate for hover is the repo's implicit convention for touch-friendly hover — grep for `md:hover:` in this file to confirm none exist yet; this plan establishes it.

## Steps

1. **Edit `components/ActressCard.tsx` line 54** — the outer wrapping `<div>`:
   
   Replace:
   ```
   hover:shadow-xl hover:-translate-y-1 transition-all duration-300
   ```
   With:
   ```
   transition-[transform,box-shadow] duration-base ease-out active:scale-[0.98] active:translate-y-[-2px] md:hover:shadow-xl md:hover:-translate-y-1
   ```
   Keep the surrounding classes (`relative bg-white rounded-xl border ... shadow-md overflow-hidden group`) unchanged.

2. **Edit `components/ActressCard.tsx` line 72** — the `<img>`:
   
   Replace:
   ```
   className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
   ```
   With:
   ```
   className="w-full h-full object-cover transition-transform duration-slow ease-out md:group-hover:scale-105"
   ```

3. **Do NOT** touch the two badges (rank at line 56, score at line 61) — they're static decorations, no interaction.

4. **Verify** the `<Link href="{...}">` wrappers (lines 66, 95, 122) are untouched. The card's outer `<div>` is not the link; the `<Link>`s inside handle navigation.

## Boundaries

- Do NOT change the card's layout, aspect ratio, colors, or content.
- Do NOT touch `VoteButton` inside the card (it has its own plan 001).
- Do NOT remove `group` — it's needed for `group-hover` on the img.
- If `active:` variants don't compile (very old Tailwind), STOP and report — this codebase should have Tailwind ≥ 3.

## Verification

- **Mechanical**:
  - `npm run lint` — zero new errors.
  - `npm run build` — success.
  - `grep "transition-all" components/ActressCard.tsx` — expect zero hits.
- **Feel check** (need both desktop and mobile emulation):
  - Desktop hover: card lifts 4px and shadow deepens over ~200ms. Movement should feel confident, not soggy — if it feels dragged, the easing token wasn't applied.
  - Desktop click-and-hold: card presses down (scale 0.98) while shifted up 2px. Release: springs back to hover state (not to rest state, because pointer is still over it).
  - Chrome DevTools → toggle device toolbar → iPhone: tap and hold a card. Should press down (scale 0.98 + translate). Release, then the hover state should NOT stick (mobile hover is disabled via `md:`).
  - Avatar zoom on hover: happens at 300ms, matching the card's 200ms — feels **like one composed motion**, not two disconnected layers.
- **Done when**: `transition-all` is gone, press feedback works on mobile, hover works on desktop only, and the card feels tactile.
