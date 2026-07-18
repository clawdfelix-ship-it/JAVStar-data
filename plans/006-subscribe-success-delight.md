# 006 — Email subscribe: delight moment on success

- **Status**: DONE (commit 98dab2e)
- **Commit**: d51a29a
- **Severity**: LOW (rare, first-time — earned delight)
- **Category**: Missed opportunities
- **Estimated scope**: 1 file (`app/HomeClient.tsx`) + 1 CSS block, ~30 lines
- **Depends on**: 000-motion-tokens

## Problem

The subscribe form flip from `[form]` → `[✅ Thanks message]` is instantaneous. This is a **rare, first-time success moment** — exactly the frequency tier where a bit of delight is justified per the audit's Missed Opportunities category.

```tsx
// app/HomeClient.tsx:126-152 — current
function EmailSignupForm() {
  return subscribeStatus === 'success' ? (
    <div className="text-center py-3">
      <span className="text-lg">✅ </span>
      <span className="text-white font-medium">{subscribeMessage}</span>
    </div>
  ) : (
    <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3">
      {/* ... input + submit button ... */}
    </form>
  );
}
```

`subscribeStatus === 'success'` — teleport. Also: the form vs. success container has no shared visual anchor.

## Target

- Wrap both branches so React unmounts the form via a keyed container, letting `@starting-style` on the success block trigger a subtle rise + scale-in for the checkmark and message.
- Success ✅ pops with a keyframe (same `vote-heart-bump` pattern as plan 001 — establish a small vocabulary of "success pop" animations).
- Message slides up 8px with staggered opacity.

```tsx
// target
function EmailSignupForm() {
  if (subscribeStatus === 'success') {
    return (
      <div className="text-center py-3 subscribe-success">
        <span className="text-2xl inline-block subscribe-check">✅</span>
        <span className="text-white font-medium ml-2 subscribe-message">
          {subscribeMessage}
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3">
      {/* unchanged */}
    </form>
  );
}
```

```css
/* app/globals.css — new blocks */
.subscribe-success {
  opacity: 1;
  transform: translateY(0);
  transition: opacity var(--duration-slow) var(--ease-out),
              transform var(--duration-slow) var(--ease-out);
}
@starting-style {
  .subscribe-success { opacity: 0; transform: translateY(12px); }
}

@keyframes subscribe-check-pop {
  0%   { transform: scale(0.4); opacity: 0; }
  55%  { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(1);   opacity: 1; }
}
.subscribe-check {
  animation: subscribe-check-pop 500ms var(--ease-out) 100ms both;
  transform-origin: center;
}

@keyframes subscribe-message-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.subscribe-message {
  animation: subscribe-message-in var(--duration-slow) var(--ease-out) 250ms both;
}

@media (prefers-reduced-motion: reduce) {
  .subscribe-success,
  .subscribe-check,
  .subscribe-message {
    animation: none;
    transition: opacity 200ms var(--ease-out);
    transform: none;
  }
}
```

Choreography:
- `t=0`     — container fades in + rises 12px (300ms)
- `t=100ms` — checkmark scales in with a 1.3× bump (500ms) — the "achievement" moment (per audit §1: delight allowed at rare/first-time tier)
- `t=250ms` — message text rises up (300ms) — reads as consequence of the check appearing

## Repo conventions to follow

- CSS goes in `app/globals.css` `/* Animation Utilities */` section.
- Kebab-case component-scoped classes (`subscribe-success`, `subscribe-check`) — matches `grid-item-enter`, `vote-heart-bump`.
- No animation library — CSS keyframes triggered by React remount is the pattern established by plans 001, 003.

## Steps

1. **Add the four CSS blocks** to `app/globals.css` under `/* Animation Utilities */`: `.subscribe-success` + its `@starting-style`, `@keyframes subscribe-check-pop` + `.subscribe-check`, `@keyframes subscribe-message-in` + `.subscribe-message`, and the `prefers-reduced-motion` overrides.

2. **Edit the `EmailSignupForm` function in `app/HomeClient.tsx` lines 126-152**:
   - Change the ternary to an early-return `if` block (target shape).
   - In the success branch, upgrade `text-lg` → `text-2xl inline-block` on the ✅ span, add `subscribe-check` class.
   - Wrap the message text in `<span className="subscribe-message ml-2">...` (removed the space that was in `✅ `).
   - Add `subscribe-success` class to the outer container.

## Boundaries

- Do NOT change the subscribe API logic (`handleEmailSubmit`, fetch, state updates).
- Do NOT touch the `idle`, `loading`, `error` branches of the form — only the `success` visual.
- Do NOT add confetti / particles / audio. The keyframes + timing above are the entire delight budget.
- Do NOT touch the form fields themselves (input, submit button) — plan is success-state-only.

## Verification

- **Mechanical**:
  - `npm run lint` — zero new errors.
  - `npm run build` — success.
- **Feel check**: submit the form with a valid email. Watch for:
  - Container appears (fade + 12px rise) around 300ms.
  - Checkmark ✅ pops in at ~100ms after container start, with a visible bump to 1.3× before settling.
  - Message text rises up 6px starting ~250ms — you should feel it come *after* the check, not with it.
  - Total sequence completes by ~600ms. If it feels longer, an `animation-delay` was miscopied.
  - Chrome DevTools → Animations panel, set playback 10%. Confirm the choreography order.
  - `prefers-reduced-motion: reduce` → all three animations collapse into a plain 200ms opacity fade. No scaling, no rising.
- **Done when**: the success moment feels earned — a small but distinct beat that says "we got it" — and reduced-motion strips all movement while keeping the state change legible.
