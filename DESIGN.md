# JAVStar-data Design System

## Brand & Vision

JAVStar-data is a **premium Japanese AV actress activity tracking platform** targeting Cantonese-speaking Hong Kong users. The experience should feel like a **modern editorial magazine** — information-dense but elegant, with a distinctly Japanese aesthetic. Not playful, not corporate — warm, refined, and culturally specific.

---

## Color System

### NIPPON COLORS (CSS Custom Properties)

```css
:root {
  /* 櫻色 - sakura - Background */
  --color-sakura: 255, 245, 247;

  /* 撫子色 - nadeshiko - Primary Brand */
  --color-nadeshiko: 244, 114, 182;      /* Main pink */
  --color-nadeshiko-dark: 236, 72, 153;  /* Deep pink (CTAs) */
  --color-nadeshiko-light: 249, 168, 212; /* Light pink (highlights) */

  /* 灰櫻色 - sakura-gray - Borders/Dividers */
  --color-sakura-gray: 229, 211, 216;

  /* 瓶覗色 - kamenozoki - Accent Blue */
  --color-kamenozoki: 186, 230, 253;
  --color-kamenozoki-dark: 125, 211, 252;

  /* 梅鼠色 - umenezumi - Primary Text (warm dark, not pure black) */
  --color-umenezumi: 100, 77, 87;
  --color-umenezumi-light: 136, 112, 122; /* Secondary text */
  --color-umenezumi-lighter: 168, 152, 160; /* Tertiary/placeholder */

  /* 純白 - shiro - Card surfaces */
  --color-shiro: 255, 255, 255;
}
```

### Semantic Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | sakura | Page background |
| `--foreground` | umenezumi | Body text |
| `--primary` | nadeshiko-dark | CTAs, active states |
| `--primary-light` | nadeshiko | Secondary buttons |
| `--secondary` | kamenozoki-dark | Links, info highlights |
| `--border` | sakura-gray | Borders, dividers |
| `--muted` | umenezumi-light | Secondary text |
| `--card` | shiro | Card backgrounds |

### Typography

**Font Stack:**
```css
font-family: 'Noto Sans HK', 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

**Scale:**
- Hero title: `text-4xl md:text-5xl lg:text-6xl font-bold`
- Section heading: `text-2xl font-bold`
- Card title: `text-base font-bold`
- Body: `text-sm`
- Caption/label: `text-xs`
- Micro label: `text-[10px]`

**Line height:** 1.5–1.75 for body text
**Line length:** 60–75 chars per line (desktop), 35–60 (mobile)

---

## Component Library

### ActressCard
- **Style:** Vertical card, 3:4 aspect ratio avatar
- **Layout:** Rank badge (top-left), score badge (top-right), avatar, info block, stats, CTA row
- **States:** Default, hover (shadow lift), active (scale down)
- **Images:** `loading="lazy"` for rank > 2, `fetchPriority="high"` for rank 1
- **Accessibility:** `alt={name_ja}`, aria-label on icon-only buttons

### EventCard
- **Style:** Horizontal card with date box on left
- **Layout:** Date+type header, venue, title, actress, footer
- **States:** Default, upcoming (normal), past (opacity 60%)
- **Date handling:** Parses both ISO and date-only formats with JST timezone offset

### VoteButton
- **Style:** Rounded pill button
- **States:** Loading (skeleton), voted (filled nadeshiko), unvoted (outline), loading (spinner)
- **Animation:** Heart scale 1→1.35→1.1 on vote (400ms), count slides up
- **Accessibility:** aria-label on loading state, disabled state with semantics

### SearchBar
- **Style:** Large input with icon prefix, clear button suffix
- **Features:** Fuzzy search, history, keyboard navigation (↑↓ Enter Esc)
- **Accessibility:** All interactive elements keyboard-navigable, aria-live for results

### DailyActressBox
- **Style:** Horizontal banner with title/button left, result card right
- **Animation:** Slot machine spin effect (15 spins, 100ms each)
- **States:** Empty (dashed placeholder), selected (avatar card), spinning

---

## Animation Philosophy

All animations serve a purpose — no decorative motion.

| Animation | Duration | Easing | Purpose |
|-----------|----------|--------|---------|
| Micro-interaction (hover) | 160ms | ease-out | Immediate feedback |
| Hover/focus state | 200ms | ease-out | Dropdown, tooltip |
| Enter/exit | 300ms | ease-out | Page transitions, modals |
| Vote heart bump | 400ms | ease-out | Celebratory confirmation |
| Stagger delay per item | 30ms | — | List entrance |
| Spin interval | 100ms | linear | Slot machine |

**Reduced motion:** All animations respect `prefers-reduced-motion` — reduce to instant/opacity-only.

---

## Accessibility (WCAG 2.1 AA)

- **Color contrast:** All text meets 4.5:1 ratio. Secondary text lifted from `168` to `128` RGB on sakura background.
- **Touch targets:** Minimum 44×44px on all interactive elements.
- **Focus states:** Visible focus rings (2–4px) on all keyboard-navigable elements.
- **Screen reader:** Semantic HTML, aria-labels on icon-only buttons, aria-live on dynamic content.
- **No color-only indicators:** Error/success states always paired with icon or text.
- **Keyboard navigation:** Full tab order support, Escape closes dropdowns.

---

## Icon Library

**Lucide React** — consistent stroke weight, no emoji.

| Icon | Component | Usage |
|------|-----------|-------|
| Star | ActressCard | Score badge |
| Calendar | ActressCard, HomeClient | Event dates, upcoming |
| Heart | VoteButton | Vote action |
| Crown | HomeClient | Ranking tab |
| Ticket | HomeClient, SearchBar | Events tab, ticket icon |
| MapPin | EventCard, HomeClient | Venue location |
| Trophy | HomeClient | Sort: 综合评分 |
| BarChart2 | HomeClient | Sort: 活動數量 |
| Flame | EventCard | Today badge |
| Zap | EventCard | Tomorrow badge |
| Search | SearchBar | Search icon |
| X | SearchBar | Clear button |
| Clock | SearchBar | Search history |
| Loader2 | SearchBar | Loading spinner |
| Gift | DailyActressBox | Blind box header |
| Dice5 | DailyActressBox | Random pick button |
| User | DailyActressBox | Avatar placeholder |
| HelpCircle | DailyActressBox | Empty state |
| ChevronLeft/Right | HomeClient | Pagination |
| RefreshCw | HomeClient | Retry button |
| Camera | HomeClient | Email signup |
| Check | HomeClient | Subscribe success |
| Sparkles | HomeClient | Badge decoration |

---

## Performance Budget

- **First Load JS:** < 150 kB
- **LCP:** < 2.5s
- **CLS:** < 0.1
- **Image format:** WebP preferred, JPEG fallback
- **Image sizing:** 125×125 thumbnails, responsive srcset
- **Code splitting:** Route-level (Next.js default)
- **Font loading:** `font-display: swap`

---

## Design Anti-Patterns (Avoid)

- ❌ Emoji as icons — use Lucide SVG
- ❌ Pure black (`#000`) on dark backgrounds — use umenezumi
- ❌ Hardcoded hex colors in components — use CSS variables
- ❌ `loading="eager"` on below-fold images — use `loading="lazy"`
- ❌ Instant state transitions (0ms) — minimum 160ms
- ❌ Placeholder-only form labels
- ❌ Horizontal scroll on mobile
- ❌ Fixed px container widths on desktop — use max-w-* and fluid spacing
- ❌ Touch targets < 44px
