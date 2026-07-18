# 005 — Search input: focus expansion + clear button

- **Status**: DONE (commit 98dab2e)
- **Commit**: d51a29a
- **Severity**: LOW (polish; secondary CTA)
- **Category**: Missed opportunities + Physicality
- **Estimated scope**: 1 file (`app/HomeClient.tsx`), ~15 lines
- **Depends on**: 000-motion-tokens

## Problem

The hero search input is functional but visually static. On focus the ring appears via Tailwind's default transition (weak); there is no way to clear it besides selecting all + delete.

```tsx
// app/HomeClient.tsx:246-258 — current
<div className="max-w-xl mx-auto mb-10">
  <div className="relative">
    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
      <span className="text-text-tertiary text-xl">🔍</span>
    </div>
    <input
      type="text"
      placeholder="搜尋女優名、活動名稱、場地..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      className="w-full pl-12 pr-4 py-4 text-lg bg-white border-2 border-border rounded-2xl shadow-froala focus:border-nadeshiko focus:ring-4 focus:ring-nadeshiko-light/30 focus:outline-none transition-all placeholder:text-text-tertiary"
    />
  </div>
</div>
```

Problems:
- `transition-all` (§5 finding).
- No clear-`✕` button; user must select-all + delete to clear a long query.
- No affordance for the transition into "has content" vs "empty" states.

## Target

- Kill `transition-all`; use `transition-[border-color,box-shadow]` only (color + shadow are the actual focus changes).
- Add a `✕` button that mounts when `search.length > 0`, using `@starting-style` for a subtle scale-in.

```tsx
// target
<div className="max-w-xl mx-auto mb-10">
  <div className="relative">
    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
      <span className="text-text-tertiary text-xl">🔍</span>
    </div>
    <input
      type="text"
      placeholder="搜尋女優名、活動名稱、場地..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      className="w-full pl-12 pr-12 py-4 text-lg bg-white border-2 border-border rounded-2xl shadow-froala
        focus:border-nadeshiko focus:ring-4 focus:ring-nadeshiko-light/30 focus:outline-none
        transition-[border-color,box-shadow] duration-base ease-out
        placeholder:text-text-tertiary"
    />
    {search.length > 0 && (
      <button
        type="button"
        onClick={() => setSearch('')}
        aria-label="清除搜尋"
        className="search-clear absolute inset-y-0 right-0 pr-4 flex items-center text-text-tertiary hover:text-nadeshiko-dark active:scale-90 transition-transform duration-fast ease-out"
      >
        <span className="text-xl leading-none">✕</span>
      </button>
    )}
  </div>
</div>
```

```css
/* app/globals.css — new block */
.search-clear {
  opacity: 1;
  transform: scale(1);
  transition: opacity var(--duration-base) var(--ease-out),
              transform var(--duration-base) var(--ease-out);
}
@starting-style {
  .search-clear { opacity: 0; transform: scale(0.85); }
}
@media (prefers-reduced-motion: reduce) {
  .search-clear {
    transition: opacity 200ms var(--ease-out);
  }
  @starting-style {
    .search-clear { transform: scale(1); }
  }
}
```

Also update `pr-4` → `pr-12` on the input (target above) so text doesn't slide behind the `✕`.

## Repo conventions to follow

- Conditional rendering with `{state && <element />}` — used already in `HomeClient.tsx:127-152` for the `EmailSignupForm`.
- Tailwind `active:scale-90` for touch feedback — pairs with plan 002's convention.
- Class name `search-clear` — matches the repo's kebab-case component-scoped classes (e.g. `fdb-tab`, `grid-item-enter`).

## Steps

1. **Add the `.search-clear` CSS block** to `app/globals.css` under `/* Animation Utilities */` (same section as other plans).

2. **Edit `app/HomeClient.tsx` lines 246-259**: replace the entire `<div className="max-w-xl mx-auto mb-10">…</div>` block with the target markup shown above. Key changes:
   - Input `className` — `transition-all` → `transition-[border-color,box-shadow] duration-base ease-out`; padding `pr-4` → `pr-12`.
   - Add the conditional `<button>` clear element after the input, before the closing `</div>`.

## Boundaries

- Do NOT alter the search logic (`value={search}`, `onChange={(e) => setSearch(e.target.value)}`). Only presentation + the new clear button.
- Do NOT add a debounce — search filtering happens in `filteredEvents` useMemo and `useActresses` SWR hook; those are separate concerns.
- Do NOT change the placeholder text or the 🔍 icon.
- Do NOT introduce icon libraries (lucide, heroicons). Plain `✕` glyph.

## Verification

- **Mechanical**:
  - `npm run lint` — zero new errors.
  - `npm run build` — success.
- **Feel check**:
  - Click into the input: border + ring appear over 200ms with `ease-out` — feels decisive, not draggy.
  - Type any character: `✕` appears with a subtle scale-in over 200ms. Should NOT jump into place.
  - Click `✕`: input clears, `✕` disappears (via unmount — no exit animation, which is acceptable for a low-severity control).
  - On mobile: tap `✕`, the button scales to 0.9 on press.
  - Chrome DevTools → Rendering → `prefers-reduced-motion: reduce`. Type: `✕` appears without the scale; press feedback still works.
- **Done when**: `transition-all` is gone from the input, `✕` appears with a subtle scale-in when there's text, and clearing feels immediate.
