# 003 — Grid entrance: replace `slide-up` keyframe with `@starting-style` transition

- **Status**: DONE (commit 98dab2e)
- **Commit**: d51a29a
- **Severity**: MEDIUM (feel + interruptibility bug — every page/tab change replays)
- **Category**: Interruptibility + Cohesion
- **Estimated scope**: 2 files (`app/globals.css`, `app/HomeClient.tsx`), ~20 lines
- **Depends on**: 000-motion-tokens

## Problem

The grid uses a fire-once CSS keyframe (`slide-up`) with per-item stagger via inline `animationDelay`. This is unfixable if the grid ever re-orders, filters, or the user pages through — the keyframe restarts from zero every time, and there's no way to interrupt or retarget it mid-flight.

```tsx
// app/HomeClient.tsx:384-390 — current
<div className="grid grid-cols-2 gap-3 sm:gap-4">
  {actresses.map((actress, index) => (
    <div key={actress.id} className="slide-up" style={{ animationDelay: `${index * 50}ms` }}>
      <ActressCard {...actress} rank={index + 1 + (page - 1) * 12} />
    </div>
  ))}
</div>
```

```css
/* app/globals.css:122-133 — current (after plan 000 lands, easing is tokenized) */
.slide-up {
  animation: slideUp var(--duration-slow) var(--ease-out) forwards;
  opacity: 0;
  transform: translateY(20px);
}
@keyframes slideUp { to { opacity: 1; transform: translateY(0); } }
```

Problems:
- `50ms * 12 = 600ms` max stagger — the last card animates *after* the user has already scrolled.
- Distance `20px` is too big for the stagger duration; feels like the cards are falling from a height, not entering.
- Cannot interrupt: navigating pages triggers a full re-mount which restarts every animation from zero — jarring during rapid pagination.

## Target

Replace the CSS keyframe with a CSS **transition** driven by `@starting-style` (Chrome 117+, Safari 17.4+, Firefox behind flag as of 2026). Same visual outcome, but transitions are interruptible — mid-flight state changes retarget smoothly.

```css
/* app/globals.css — replace lines 122-133 */
.grid-item-enter {
  opacity: 1;
  transform: translateY(0);
  transition: opacity var(--duration-slow) var(--ease-out),
              transform var(--duration-slow) var(--ease-out);
}

@starting-style {
  .grid-item-enter {
    opacity: 0;
    transform: translateY(8px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .grid-item-enter {
    transition: opacity 200ms var(--ease-out);
  }
  @starting-style {
    .grid-item-enter { transform: none; }
  }
}
```

```tsx
// app/HomeClient.tsx:384-390 — target
<div className="grid grid-cols-2 gap-3 sm:gap-4">
  {actresses.map((actress, index) => (
    <div
      key={actress.id}
      className="grid-item-enter"
      style={{ transitionDelay: `${Math.min(index * 30, 240)}ms` }}
    >
      <ActressCard {...actress} rank={index + 1 + (page - 1) * 12} />
    </div>
  ))}
</div>
```

Changes:
- `slide-up` keyframe → `.grid-item-enter` transition + `@starting-style`.
- Distance `20px` → `8px` (subtler, appropriate for the shorter stagger).
- Per-item stagger `50ms` → `30ms`, capped at `240ms` (so cards 9-12 all share the final delay slot — no user waits >240ms for the last card).
- `animationDelay` → `transitionDelay` (transitions honor delays for both directions and retargeting).
- Reduced-motion: opacity fade only, no vertical movement.

## Repo conventions to follow

- CSS goes in `app/globals.css` under `/* Animation Utilities */` section starting at line 117.
- The old `.slide-up` and `@keyframes slideUp` blocks should be **replaced**, not left behind — grep the codebase to confirm `slide-up` is only used in `HomeClient.tsx:386` (this plan's target) so it can be safely retired.
- Exemplar of `@starting-style` in this repo: none yet — this plan establishes the pattern.

## Steps

1. **Verify `slide-up` has no other consumers**:
   ```
   grep -r "slide-up" app/ components/
   ```
   Expected: exactly one hit in `app/HomeClient.tsx:386`. If there are more, STOP and report — the plan will need to migrate all callers, not just one.

2. **Replace `app/globals.css:122-133`** (the entire `.slide-up { ... }` and `@keyframes slideUp { ... }` blocks) with the four blocks from the Target section: `.grid-item-enter`, `@starting-style` for it, plus the `@media (prefers-reduced-motion)` overrides.

3. **Edit `app/HomeClient.tsx:386`**:
   - Change `className="slide-up"` to `className="grid-item-enter"`.
   - Change `style={{ animationDelay: \`${index * 50}ms\` }}` to `style={{ transitionDelay: \`${Math.min(index * 30, 240)}ms\` }}`.

## Boundaries

- Do NOT touch the `ActressCard` component inside the map — plan 002 handles it.
- Do NOT introduce a JS-based stagger utility (react-transition-group, framer-motion `AnimatePresence`). This plan sticks to pure CSS.
- Do NOT change the grid layout (`grid-cols-2 gap-3 sm:gap-4`).
- If `@starting-style` isn't recognized by the build (would surface as a PostCSS warning, not an error), STOP and report — Next.js 15's built-in PostCSS should pass it through, but confirm before proceeding.

## Verification

- **Mechanical**:
  - `npm run lint` — zero new errors.
  - `npm run build` — success. PostCSS may print an unknown-at-rule *warning* about `@starting-style`; that's fine, the CSS ships as-is.
  - `grep "slide-up" app/ components/` — zero hits after the change.
- **Feel check**:
  - Reload homepage. Cards should stagger in with `30ms` between neighbors and the last card done by ~540ms after mount (300ms transition + 240ms cap). Should feel like a wave, not falling raindrops.
  - Chrome DevTools → Animations panel (⋮ → More tools → Animations). Set playback to 10%. Confirm each card starts at `opacity 0, translateY(8px)` and settles to `opacity 1, translateY(0)`.
  - Rapidly click pagination `→`, `←`, `→`, `←`. The keyframe version would restart from zero on every page change — the transition version does the same but should visually feel less choppy because transitions retarget from their current computed state instead of hard-restarting. If you see hard flashes, `@starting-style` didn't apply.
  - Chrome DevTools → Rendering → `prefers-reduced-motion: reduce`. Reload. Cards fade in without vertical movement.
- **Done when**: the grid enters with a shorter, tighter stagger; `slide-up` class is gone; reduced-motion drops the translate; and the visual feel matches "content settling into place" rather than "content flying up from below".
