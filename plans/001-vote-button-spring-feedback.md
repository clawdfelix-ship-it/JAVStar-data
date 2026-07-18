# 001 — VoteButton: press feedback + heart pop on toggle

- **Status**: DONE (commit 98dab2e)
- **Commit**: d51a29a
- **Severity**: HIGH (primary CTA, "does this site have care?" moment)
- **Category**: Physicality & origin + Missed opportunities
- **Estimated scope**: 1 file, ~30 lines
- **Depends on**: 000-motion-tokens

## Problem

Primary CTA is a click-only heart with no press feedback and no state-change moment.

```tsx
// components/VoteButton.tsx:74-91 — current
<button
  onClick={handleVote}
  disabled={loading}
  className={`flex items-center ${sizeClasses} rounded-full transition-all duration-200 ${
    hasVoted
      ? 'bg-[rgb(var(--color-nadeshiko-dark))] text-white ...'
      : 'bg-white text-[rgb(var(--color-umenezumi-light))] ...'
  } ${loading ? 'opacity-50 cursor-wait' : ''} ${className}`}
>
  <span className={`text-base leading-none ${hasVoted ? 'scale-110' : ''} transition-transform`}>
    {hasVoted ? '♥' : '♡'}
  </span>
  <span className="font-bold">{voteCount}</span>
  {size === 'md' && (
    <span className="text-[10px] opacity-80">{hasVoted ? '已投' : '投票'}</span>
  )}
</button>
```

Problems:
- `transition-all` (finding: performance §5 — animates paint-triggering properties).
- No `:active` press feedback.
- Icon jumps `♡ → ♥` with only a static `scale-110` — no pop.
- Number changes instantly (`{voteCount}` re-renders with zero bridge).

## Target

- `transition-all` → explicit `transition: transform, background-color, color, border-color`.
- Press feedback: `active:scale-[0.94]` with `duration-fast` (`160ms var(--ease-out)`).
- Heart toggle: when `hasVoted` flips, briefly bump the icon to `scale(1.35)` then settle to `scale(1.1)` via a keyframe (the closest CSS approximation to a spring given no motion library is installed). Bump lasts 400ms with a designed curve.
- Number: crossfade + tiny upward slide when `voteCount` changes, using a `key={voteCount}` trick + CSS animation.

```tsx
// target markup shape
<button
  onClick={handleVote}
  disabled={loading}
  className={`flex items-center ${sizeClasses} rounded-full
    transition-[transform,background-color,color,border-color]
    duration-base ease-out
    active:scale-[0.94]
    disabled:active:scale-100
    ${hasVoted ? '...voted classes' : '...unvoted classes'}
    ${loading ? 'opacity-50 cursor-wait' : ''} ${className}`}
>
  <span
    key={hasVoted ? 'voted' : 'unvoted'}
    className={`text-base leading-none ${hasVoted ? 'vote-heart-bump' : ''}`}
  >
    {hasVoted ? '♥' : '♡'}
  </span>
  <span className="font-bold vote-count" key={voteCount}>
    {voteCount}
  </span>
  ...
</button>
```

```css
/* app/globals.css — new utilities */
@keyframes vote-heart-bump {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.35); }
  100% { transform: scale(1.1); }
}
.vote-heart-bump {
  animation: vote-heart-bump 400ms var(--ease-out);
  animation-fill-mode: forwards;
  transform-origin: center;
}

@keyframes vote-count-slide {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.vote-count {
  display: inline-block;
  animation: vote-count-slide var(--duration-base) var(--ease-out);
}

@media (prefers-reduced-motion: reduce) {
  .vote-heart-bump,
  .vote-count { animation: none; }
}
```

## Repo conventions to follow

- Component-local CSS lives in `app/globals.css` under `/* Animation Utilities */` section (line 118).
- Tailwind arbitrary values via `active:scale-[0.94]` — matches existing style (see `app/HomeClient.tsx:264` `hover:-translate-y-1`).
- **No new dependencies**: Motion / Framer Motion NOT installed. Use CSS keyframes with a `key` prop re-mount to trigger re-runs — this is the accepted no-lib pattern for one-shot animations.
- Exemplar of `key`-driven remount: none in this repo yet; this plan establishes it.

## Steps

1. **Add three CSS blocks to `app/globals.css`** (after line 163, in the `/* Animation Utilities */` section):
   - `@keyframes vote-heart-bump` + `.vote-heart-bump` class
   - `@keyframes vote-count-slide` + `.vote-count` class
   - `@media (prefers-reduced-motion: reduce)` override
   
   Use the exact code in the Target section.

2. **Edit `components/VoteButton.tsx`**:

   a. Replace `transition-all duration-200` (line 78) with `transition-[transform,background-color,color,border-color] duration-base ease-out active:scale-[0.94] disabled:active:scale-100`.

   b. On the heart `<span>` (line 84), replace `className={`text-base leading-none ${hasVoted ? 'scale-110' : ''} transition-transform`}` with:
      ```tsx
      key={hasVoted ? 'voted' : 'unvoted'}
      className={`text-base leading-none inline-block ${hasVoted ? 'vote-heart-bump' : ''}`}
      ```
      The `key` change on toggle remounts the span, which restarts the CSS animation from step 0.

   c. On the count `<span>` (line 87), add `key={voteCount}` and change className to `font-bold vote-count`.

3. **Verify the checking-state button** (line 66-71) is left untouched — that's the initial loading state, no animation needed there.

## Boundaries

- Do NOT change the vote API logic (`handleVote`, `useEffect`).
- Do NOT touch `ActressCard.tsx` even though it hosts `VoteButton` — that component has its own plan (002).
- Do NOT add Framer Motion, Motion, react-spring, or any other animation library. If a step doesn't work with plain CSS + React `key`, STOP and report — don't reach for a library.
- Do NOT change the emoji glyphs (`♡`, `♥`).

## Verification

- **Mechanical**:
  - `npm run lint` — zero new errors.
  - `npm run build` — success.
  - `grep "transition-all" components/VoteButton.tsx` — expect zero hits.
- **Feel check**: open any actress card on homepage, click the vote heart.
  - The button visibly presses down (`scale 0.94`) the instant the pointer goes down, not on release.
  - Heart glyph pops to ~1.35× briefly then settles at 1.1× when transitioning `♡ → ♥`. Should feel *organic*, not a linear scale.
  - Number crossfades + slides up 6px when it increments; you should not see the old and new number overlap or teleport.
  - Rapidly toggle: each toggle restarts the pop from the current visual state — no compounding weirdness. If you see the heart get progressively bigger with each click, the `key` isn't working.
  - Chrome DevTools → Rendering → check "Emulate CSS media feature `prefers-reduced-motion` = reduce": now the number and heart change instantly, but the button still has `:active` scale (that's press feedback, kept intentionally).
- **Done when**: all four visible motions above happen, `prefers-reduced-motion` disables the two keyframes but leaves press feedback, and the button feels like a physical, pressable thing.
