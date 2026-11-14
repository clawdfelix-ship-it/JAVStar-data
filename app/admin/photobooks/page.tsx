import PhotobooksAstryxPanel from './PhotobooksAstryxPanel';

export const dynamic = 'force-dynamic';

// Live photobooks route now uses the Astryx implementation.
// Previous Tailwind client retained as PhotobooksAdminClient.tsx.bak for rollback.
export default function PhotobooksAdminPage() {
  return <PhotobooksAstryxPanel />;
}
