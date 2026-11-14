import NewsAstryxPanel from '../news-astryx/NewsAstryxPanel';

export const dynamic = 'force-dynamic';

// Live news-moderation route now uses the Astryx implementation.
// Previous Tailwind client retained as NewsAdminClient.tsx.bak for rollback.
export default function NewsAdminPage() {
  return <NewsAstryxPanel />;
}
