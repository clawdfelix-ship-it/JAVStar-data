# 007 — Kill decorative hover on stats cards (data-first)

- **Status**: DONE (commit 98dab2e)
- **Commit**: d51a29a
- **Severity**: MEDIUM (correctness — hover moves numbers the user is reading)
- **Category**: Purpose & frequency
- **Estimated scope**: 1 file (`app/HomeClient.tsx`), 4 line changes
- **Depends on**: none (independent of 000, though it can land after)

## Problem

The four hero stats cards (註冊女優, 活動記錄, 年度數據, 數據更新) lift on hover. These are **information the user is reading** — hover motion competes with reading and adds no value. Per audit §1 (Purpose & frequency), decorative motion on functional, information-dense UI is a rejection.

```tsx
// app/HomeClient.tsx:264, 272, 280, 288 — current (four occurrences)
<div className="fdb-card p-5 text-center hover:-translate-y-1 transition-transform">
```

## Target

Remove the `hover:-translate-y-1 transition-transform` from all four stat cards. Leave the card visual (background, shadow, padding) untouched.

```tsx
// target — all four instances
<div className="fdb-card p-5 text-center">
```

## Repo conventions to follow

- `fdb-card` class already covers the resting visual — hover was decorative.
- Grep confirmation: the phrase `hover:-translate-y-1 transition-transform` should exist in exactly these four places after this plan lands nowhere else (aside from the ActressCard, which plan 002 handles separately and correctly since cards are *pressable*, unlike stats).

## Steps

1. **Grep first**:
   ```
   grep -n "hover:-translate-y-1 transition-transform" app/HomeClient.tsx
   ```
   Expected: four hits at lines 264, 272, 280, 288 (line numbers may drift by ±2 if earlier plans landed first). If more or fewer hits, STOP and report.

2. **For each of the four `<div className="fdb-card p-5 text-center hover:-translate-y-1 transition-transform">` lines**: remove the trailing ` hover:-translate-y-1 transition-transform`. Result: `<div className="fdb-card p-5 text-center">`.

3. Do NOT touch any other `hover:` styles elsewhere in the file — `ActressCard` (plan 002) has its own hover strategy, and other components are out of scope.

## Boundaries

- Do NOT change the card content (`.text-3xl`, numbers, labels, `.animate-pulse` on the loading `--` placeholder).
- Do NOT touch the `.fdb-card` class definition in globals.css.
- If you find only 3 hits or 5+ hits from the grep, STOP — the file has drifted and this plan needs re-scoping.

## Verification

- **Mechanical**:
  - `npm run lint` — zero new errors.
  - `npm run build` — success.
  - `grep "hover:-translate-y-1" app/HomeClient.tsx` — zero hits after the change.
- **Feel check**:
  - Hover over each stats card on the hero. Nothing should move. The numbers should stay stable — that's the whole point.
  - Verify the four cards still render with the correct data (`5,214` / `1,317` / `2026` / `每日更新` when SWR resolves).
  - Rest of the hero (search bar, subscribe form) still animates as expected — this plan is purely subtractive.
- **Done when**: no stat card moves on hover, and the numbers are readable without visual competition.
