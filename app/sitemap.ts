import { MetadataRoute } from 'next';

const BASE_URL = 'https://jav-star-data.vercel.app';

interface Actress {
  id: string;
  updated_at: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 靜態路由
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1.0,
    },
  ];

  // 動態獲取所有女優路由
  try {
    // 生產環境使用絕對路徑，開發環境使用相對
    const apiUrl = process.env.NEXT_PUBLIC_URL 
      ? `${process.env.NEXT_PUBLIC_URL}/api/actresses?limit=1000`
      : `${BASE_URL}/api/actresses?limit=1000`;

    const response = await fetch(apiUrl, {
      cache: 'no-store',
      next: { revalidate: 3600 },
    });

    if (response.ok) {
      const data = await response.json();
      const actresses = data.data || data.actresses || data;
      
      if (Array.isArray(actresses)) {
        const actressRoutes: MetadataRoute.Sitemap = actresses.map((actress: Actress) => ({
          url: `${BASE_URL}/actress/${actress.id}`,
          lastModified: actress.updated_at ? new Date(actress.updated_at) : new Date(),
          changeFrequency: 'daily',
          priority: 0.8,
        }));

        return [...staticRoutes, ...actressRoutes];
      }
    }
  } catch (error) {
    console.error('Sitemap fetch error:', error);
  }

  // 如果 API 失敗，至少返回首頁
  return staticRoutes;
}
