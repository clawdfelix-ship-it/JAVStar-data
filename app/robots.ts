import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/_next/',
      ],
    },
    sitemap: 'https://jav-star-data.vercel.app/sitemap.xml',
    host: 'https://jav-star-data.vercel.app',
  };
}
