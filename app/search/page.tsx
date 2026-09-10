import type { Metadata } from 'next';
import SearchResultsClient from './SearchResultsClient';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `搜尋「${q}」｜J-STAR CALENDAR` : '搜尋｜J-STAR CALENDAR',
    robots: { index: false, follow: true },
  };
}

// 承接 JSON-LD SearchAction 對外宣稱嘅 /search?q=（以前 404）
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;
  return <SearchResultsClient initialQuery={q} />;
}
