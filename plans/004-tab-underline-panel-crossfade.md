# 004 — Tab underline + content crossfade

- **Status**: DONE (commit 98dab2e)
- **Commit**: d51a29a
- **Severity**: MEDIUM (spatial-consistency gap, hit every session)
- **Category**: Physicality & origin + Missed opportunities
- **Estimated scope**: 2 files (`app/HomeClient.tsx`, `app/globals.css`), ~40 lines
- **Depends on**: 000-motion-tokens

## Problem

Switching between `女優排名 / 活動日曆 / 活動列表` tabs is a teleport. The active tab's underline (implicit in the `fdb-tab.active` class) jumps and the panel below swaps instantly with no bridge.

```tsx
// app/HomeClient.tsx:322-338 — current
<div className="sticky top-0 z-40 border-b shadow-sm bg-white border-border">
  <div className="max-w-7xl mx-auto px-4">
    <div className="flex items-center justify-center gap-2 py-3">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`fdb-tab ${activeTab === tab.id ? 'active' : ''}`}
        >
          <span className="text-lg">{tab.icon}</span>
          <span>{tab.label}</span>
          <span className="fdb-badge">{tab.count}</span>
        </button>
      ))}
    </div>
  </div>
</div>
```

Panels below (lines 345, 419, 436) render conditionally by activeTab equality — instant swap.

## Target

Two coordinated motions:

1. **Underline slides** from the previous active tab to the new one via a shared absolutely-positioned indicator, positioned by measuring the active button (`getBoundingClientRect`). Uses the `--ease-drawer` iOS curve for a distinctly Apple feel on the primary nav.

2. **Panel content crossfades** with 4px translateY, timed to overlap the underline slide.

```tsx
// target — tab row
const tabsContainerRef = useRef<HTMLDivElement>(null);
const [underline, setUnderline] = useState({ left: 0, width: 0 });

useLayoutEffect(() => {
  const container = tabsContainerRef.current;
  if (!container) return;
  const active = container.querySelector<HTMLButtonElement>(`[data-tab-id="${activeTab}"]`);
  if (!active) return;
  const cRect = container.getBoundingClientRect();
  const aRect = active.getBoundingClientRect();
  setUnderline({ left: aRect.left - cRect.left, width: aRect.width });
}, [activeTab]);

// ...

<div className="sticky top-0 z-40 border-b shadow-sm bg-white border-border">
  <div className="max-w-7xl mx-auto px-4">
    <div ref={tabsContainerRef} className="relative flex items-center justify-center gap-2 py-3">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          data-tab-id={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`fdb-tab ${activeTab === tab.id ? 'active' : ''}`}
        >
          <span className="text-lg">{tab.icon}</span>
          <span>{tab.label}</span>
          <span className="fdb-badge">{tab.count}</span>
        </button>
      ))}
      <span
        aria-hidden
        className="tab-underline"
        style={{
          transform: `translateX(${underline.left}px)`,
          width: underline.width,
        }}
      />
    </div>
  </div>
</div>

{/* panels — wrap each in .tab-panel and give the container a key on activeTab */}
<main key={activeTab} className="tab-panel max-w-7xl mx-auto px-4 md:px-6 py-8">
  {/* existing conditional panels */}
</main>
```

```css
/* app/globals.css — new blocks */
.tab-underline {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  background: rgb(var(--color-nadeshiko-dark));
  border-radius: 2px;
  transition: transform var(--duration-slow) var(--ease-drawer),
              width   var(--duration-slow) var(--ease-drawer);
  pointer-events: none;
  will-change: transform, width;
}

.tab-panel {
  opacity: 1;
  transform: translateY(0);
  transition: opacity var(--duration-base) var(--ease-out),
              transform var(--duration-base) var(--ease-out);
}
@starting-style {
  .tab-panel { opacity: 0; transform: translateY(4px); }
}

@media (prefers-reduced-motion: reduce) {
  .tab-underline { transition: opacity 200ms var(--ease-out); }
  .tab-panel { transition: opacity 200ms var(--ease-out); }
  @starting-style { .tab-panel { transform: none; } }
}
```

**Do NOT** remove the existing `.fdb-tab.active` underline styling (it likely uses a bottom-border); instead, hide it when the shared underline is present. If `.fdb-tab.active` doesn't have a bottom-border (only weight/color changes), leave it — the shared underline is purely additive.

## Repo conventions to follow

- React hooks style: `useRef`, `useLayoutEffect`, `useState` are already used throughout `HomeClient.tsx`.
- `fdb-*` prefix for reusable classes (see `.fdb-tab`, `.fdb-badge`, `.fdb-card` in globals.css).
- `data-*` attributes for DOM selection are new to this file — this plan establishes them.
- No framer-motion / motion — pure CSS + measured DOM.

## Steps

1. **Inspect `.fdb-tab.active`** in `app/globals.css` (grep for `fdb-tab`). If it draws its own underline (bottom-border, box-shadow bottom, ::after pseudo), record the exact selector and add `.fdb-tab.active { border-bottom: none; }` (or override its underline mechanism) alongside the new `.tab-underline` block. If it does not draw an underline, skip this.

2. **Add the three CSS blocks** from the Target section to `app/globals.css` under `/* Animation Utilities */`: `.tab-underline`, `.tab-panel` + its `@starting-style`, and the `prefers-reduced-motion` overrides.

3. **Edit `app/HomeClient.tsx`**:
   - Add `useRef, useLayoutEffect` to the React import at line 3.
   - Add the `tabsContainerRef` and `underline` state, plus the `useLayoutEffect` measuring block, immediately after `const tabs = [...]` at line 215 (before the `return`).
   - Wrap the tab row at line 324 (`<div className="flex items-center justify-center gap-2 py-3">`) with `ref={tabsContainerRef}` and add `relative` to the classes: `<div ref={tabsContainerRef} className="relative flex items-center justify-center gap-2 py-3">`.
   - On each `<button>` in the tab map (line 326), add `data-tab-id={tab.id}`.
   - After the closing `</button>` in the map but before the closing `</div>` of the row, insert the `<span className="tab-underline" ... />` element.
   - Add `key={activeTab}` and `className="tab-panel ..."` to the `<main>` at line 343 (preserving existing classes).

## Boundaries

- Do NOT change tab labels, icons, or the `count` values.
- Do NOT modify the panel content (the three `{activeTab === '...' && ...}` blocks) — only the surrounding `<main>` wrapper gets `key` + `.tab-panel` class.
- Do NOT introduce framer-motion `<AnimatePresence>` or similar. CSS + `key` remount + `@starting-style` handle it.
- If `.fdb-tab.active` has complex existing underline styling that clashes visibly with the new shared underline, STOP and report — don't guess how to reconcile.

## Verification

- **Mechanical**:
  - `npm run lint` — zero new errors.
  - `npm run build` — success.
- **Feel check**:
  - Click through tabs `女優排名 → 活動日曆 → 活動列表 → 女優排名`. The underline should slide smoothly under each tab, following an iOS-like curve (decisive, no bounce). If it hard-jumps, the measuring `useLayoutEffect` didn't run or the underline isn't `position: absolute` in a `position: relative` parent.
  - The content below fades + rises 4px on each tab change over 200ms. If it teleports, the `key={activeTab}` on `<main>` didn't remount.
  - Resize the window: underline should reposition (browser re-runs the effect only on tab change — this is acceptable; if you want it perfect across resize, add a `ResizeObserver` in a later plan).
  - Chrome DevTools → Rendering → `prefers-reduced-motion: reduce`. Reload. Tab switches with opacity crossfade only, no slide.
- **Done when**: underline slides between tabs on a designed curve, panel crossfades with a subtle rise, and both respect reduced motion.
