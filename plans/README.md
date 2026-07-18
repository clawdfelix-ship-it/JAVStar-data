# Animation Plans — JAVStar-data

Prioritized motion improvements distilled from an `improve-animations` audit against Emil Kowalski's design engineering principles. All plans are read-only specifications; execution is up to a coding agent, another model, or you.

**Commit at audit time:** `d51a29a`

## Order of execution

Plan `000` is a **hard prerequisite** for every subsequent plan — it introduces the shared easing + duration vocabulary that the others reference by name (`--ease-out`, `duration-base`, etc.). Do 000 first, everything else is parallelizable.

| # | Title | Severity | Files | Depends on | Status |
|---|---|---|---|---|---|
| 000 | Introduce shared easing & duration tokens | HIGH | globals.css, tailwind.config.js | — | TODO |
| 001 | VoteButton: press feedback + heart pop on toggle | HIGH | VoteButton.tsx, globals.css | 000 | TODO |
| 002 | ActressCard: replace hover-only with hover + press, kill `transition-all` | HIGH | ActressCard.tsx | 000 | TODO |
| 003 | Grid entrance: replace `slide-up` keyframe with `@starting-style` transition | MEDIUM | HomeClient.tsx, globals.css | 000 | TODO |
| 004 | Tab underline + content crossfade | MEDIUM | HomeClient.tsx, globals.css | 000 | TODO |
| 005 | Search input: focus expansion + clear button | LOW | HomeClient.tsx, globals.css | 000 | TODO |
| 006 | Email subscribe: delight moment on success | LOW | HomeClient.tsx, globals.css | 000 | TODO |
| 007 | Kill decorative hover on stats cards (data-first) | MEDIUM | HomeClient.tsx | — | TODO |

## Recommended sequencing

**Wave 1 — foundation & highest leverage:** 000 → (001, 002, 007 in parallel)
- 000 unlocks tokens.
- 001 is the primary CTA feel-lift.
- 002 fixes 12 cards on every homepage load.
- 007 is a pure subtraction — takes 2 minutes and removes a correctness problem.

**Wave 2 — structural motion:** 003, 004
- Both introduce `@starting-style` — do them together so PostCSS warnings surface once, not twice.

**Wave 3 — polish:** 005, 006
- Low severity, do last or skip entirely.

## What was deliberately NOT planned

From the audit, rejected candidates (all correct rejections):

- **Command palette / keyboard tab-switch feedback** — 100+/day frequency, animation would feel like lag.
- **Search `onChange` feedback** — every keystroke; motion would delay perceived typing.
- **VirtualList row enter/exit** — scrolling triggers hundreds per second; any animation would be janky.
- **Pagination page transition** — users pressing pagination want speed, not choreography.
- **Site-wide route transitions** — Next.js App Router; adding motion here has huge scope and low return for a data-heavy content site.

## Sizing (rough)

- 000: 10 min
- 001: 25 min
- 002: 15 min
- 003: 20 min
- 004: 40 min (most complex — measured DOM)
- 005: 15 min
- 006: 25 min
- 007: 3 min

**Total for full sweep:** ~2.5 hours of focused work.

## When to re-run the audit

- After any major re-theme (NIPPON COLORS is currently applied — motion tokens should survive re-themes).
- After adding a route with a new interaction pattern (drag, modal, drawer).
- After adopting a motion library (motion / framer-motion), if you do — the tokens transfer, but spring configs should live alongside them.

Run `improve-animations reconcile` after landing plans to mark them DONE and refresh stale file:line references.
