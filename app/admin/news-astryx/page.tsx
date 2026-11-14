'use client';

// Dedicated Astryx news-moderation route (full login gate).
// All component logic lives in NewsAstryxPanel.tsx so it can also be embedded
// in the unified /admin shell without adding named exports to a route module.
import { NewsAstryxStandalone } from './NewsAstryxPanel';

export const dynamic = 'force-dynamic';

export default function NewsAstryxPage() {
  return <NewsAstryxStandalone />;
}
